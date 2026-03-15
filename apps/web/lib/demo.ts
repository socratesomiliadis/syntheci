import { and, eq } from "drizzle-orm";

import { embedTexts } from "@syntheci/ai";
import {
  chunkText,
  demoSyncEmailBatches,
  isDemoConnectedAccountMetadata,
  JOB_NAMES,
  QUEUE_NAMES,
  type DemoConnectedAccountMetadata,
  type DemoEmailFixture
} from "@syntheci/shared";
import {
  connectedAccounts,
  contentChunks,
  db,
  messages,
  sources,
  triageResults,
  upsertObservedContact
} from "@syntheci/db";

import { syncContactKnowledge } from "./contacts";
import { upsertJobAudit } from "./jobs-audit";

function resolveDemoMetadata(metadata: unknown) {
  return isDemoConnectedAccountMetadata(metadata) ? metadata : null;
}

export function isDemoConnectedAccount(account: { metadata: unknown }) {
  return resolveDemoMetadata(account.metadata) !== null;
}

export function getDemoMetadata(metadata: unknown) {
  return resolveDemoMetadata(metadata);
}

function buildIndexableMessageText(input: {
  subject: string | null;
  senderName: string | null;
  senderEmail: string | null;
  text: string;
}) {
  const sections = [
    input.subject ? `Subject: ${input.subject}` : null,
    input.senderName ? `Sender: ${input.senderName}` : null,
    input.senderEmail ? `Sender email: ${input.senderEmail}` : null,
    input.text
  ].filter((section): section is string => Boolean(section && section.trim()));

  return sections.join("\n\n");
}

async function indexDemoMessageText(input: {
  workspaceId: string;
  sourceId: string;
  messageId: string;
  subject: string | null;
  senderName: string | null;
  senderEmail: string | null;
  text: string;
}) {
  const chunks = chunkText(
    buildIndexableMessageText({
      subject: input.subject,
      senderName: input.senderName,
      senderEmail: input.senderEmail,
      text: input.text
    })
  );
  if (chunks.length === 0) {
    return 0;
  }

  await db
    .delete(contentChunks)
    .where(
      and(
        eq(contentChunks.workspaceId, input.workspaceId),
        eq(contentChunks.messageId, input.messageId)
      )
    );

  const embeddings = await embedTexts(chunks.map((chunk) => chunk.content));
  if (embeddings.length !== chunks.length) {
    throw new Error("Embedding count mismatch for demo message indexing");
  }

  await db.insert(contentChunks).values(
    chunks.map((chunk, index) => ({
      workspaceId: input.workspaceId,
      sourceId: input.sourceId,
      messageId: input.messageId,
      content: chunk.content,
      tokenCount: chunk.tokenCount,
      embedding: embeddings[index],
      rankBoost: 1.1
    }))
  );

  return chunks.length;
}

async function persistDemoFixtureMessage(input: {
  workspaceId: string;
  sourceId: string;
  fixture: DemoEmailFixture;
}) {
  const contact = await upsertObservedContact({
    workspaceId: input.workspaceId,
    name: input.fixture.senderName,
    email: input.fixture.senderEmail,
    origin: "gmail_sender",
    observedAt: new Date(input.fixture.receivedAt),
    lastMessageAt: new Date(input.fixture.receivedAt),
    metadata: {
      source: "demo_gmail"
    }
  });

  if (contact) {
    await syncContactKnowledge(contact);
  }

  const [message] = await db
    .insert(messages)
    .values({
      workspaceId: input.workspaceId,
      sourceId: input.sourceId,
      senderContactId: contact?.id ?? null,
      externalMessageId: input.fixture.externalMessageId,
      externalThreadId: input.fixture.externalThreadId,
      senderName: input.fixture.senderName,
      senderEmail: input.fixture.senderEmail,
      subject: input.fixture.subject,
      textBody: input.fixture.textBody,
      htmlBody: input.fixture.htmlBody ?? null,
      deepLink:
        input.fixture.deepLink ??
        `https://mail.google.com/mail/u/0/#inbox/${input.fixture.externalMessageId}`,
      receivedAt: new Date(input.fixture.receivedAt),
      isUnread: input.fixture.isUnread,
      isOpenThread: input.fixture.isOpenThread ?? true,
      rawPayload: {
        demo: true,
        importedAt: new Date().toISOString(),
        fixtureKey: input.fixture.key
      }
    })
    .onConflictDoUpdate({
      target: [messages.sourceId, messages.externalMessageId],
      set: {
        senderContactId: contact?.id ?? null,
        externalThreadId: input.fixture.externalThreadId,
        senderName: input.fixture.senderName,
        senderEmail: input.fixture.senderEmail,
        subject: input.fixture.subject,
        textBody: input.fixture.textBody,
        htmlBody: input.fixture.htmlBody ?? null,
        deepLink:
          input.fixture.deepLink ??
          `https://mail.google.com/mail/u/0/#inbox/${input.fixture.externalMessageId}`,
        receivedAt: new Date(input.fixture.receivedAt),
        isUnread: input.fixture.isUnread,
        isOpenThread: input.fixture.isOpenThread ?? true,
        rawPayload: {
          demo: true,
          importedAt: new Date().toISOString(),
          fixtureKey: input.fixture.key
        },
        updatedAt: new Date()
      }
    })
    .returning({
      id: messages.id
    });

  await db
    .insert(triageResults)
    .values({
      workspaceId: input.workspaceId,
      messageId: message.id,
      label: input.fixture.triage.label,
      confidence: input.fixture.triage.confidence,
      rationale: input.fixture.triage.rationale,
      modelVersion: "demo-seeded"
    })
    .onConflictDoUpdate({
      target: triageResults.messageId,
      set: {
        label: input.fixture.triage.label,
        confidence: input.fixture.triage.confidence,
        rationale: input.fixture.triage.rationale,
        modelVersion: "demo-seeded",
        updatedAt: new Date()
      }
    });

  await indexDemoMessageText({
    workspaceId: input.workspaceId,
    sourceId: input.sourceId,
    messageId: message.id,
    subject: input.fixture.subject,
    senderName: input.fixture.senderName,
    senderEmail: input.fixture.senderEmail,
    text: input.fixture.textBody
  });
}

export async function importNextDemoSyncBatch(input: {
  workspaceId: string;
  connectedAccountId: string;
}) {
  const account = await db.query.connectedAccounts.findFirst({
    where: and(
      eq(connectedAccounts.id, input.connectedAccountId),
      eq(connectedAccounts.workspaceId, input.workspaceId),
      eq(connectedAccounts.provider, "google")
    )
  });

  if (!account) {
    throw new Error("Demo connector not found");
  }

  const metadata = resolveDemoMetadata(account.metadata);
  if (!metadata) {
    throw new Error("Connected account is not a demo connector");
  }

  const nextBatchId = metadata.remainingSyncBatchIds[0] ?? null;
  if (!nextBatchId) {
    return {
      batchId: null,
      importedCount: 0
    };
  }

  const fixtures = demoSyncEmailBatches[nextBatchId] ?? [];
  const gmailSource = await db.query.sources.findFirst({
    where: and(
      eq(sources.workspaceId, input.workspaceId),
      eq(sources.connectedAccountId, input.connectedAccountId),
      eq(sources.type, "gmail")
    )
  });

  if (!gmailSource) {
    throw new Error("Demo Gmail source not found");
  }

  for (const fixture of fixtures) {
    await persistDemoFixtureMessage({
      workspaceId: input.workspaceId,
      sourceId: gmailSource.id,
      fixture
    });
  }

  const nextMetadata: DemoConnectedAccountMetadata = {
    ...metadata,
    remainingSyncBatchIds: metadata.remainingSyncBatchIds.slice(1),
    importedSyncBatchIds: [...metadata.importedSyncBatchIds, nextBatchId]
  };

  await db
    .update(connectedAccounts)
    .set({
      metadata: nextMetadata,
      updatedAt: new Date()
    })
    .where(eq(connectedAccounts.id, account.id));

  await upsertJobAudit({
    workspaceId: input.workspaceId,
    queueName: QUEUE_NAMES.ingestion,
    jobName: JOB_NAMES.SYNC_GMAIL_ACCOUNT,
    idempotencyKey: `demo-sync:${input.connectedAccountId}:${nextBatchId}`,
    status: "completed",
    attempts: 1,
    payload: {
      connectedAccountId: input.connectedAccountId,
      demo: true,
      batchId: nextBatchId,
      importedCount: fixtures.length
    }
  });

  return {
    batchId: nextBatchId,
    importedCount: fixtures.length
  };
}
