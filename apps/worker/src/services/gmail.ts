import { and, eq } from "drizzle-orm";
import { google } from "googleapis";

import { classifyMessageTriage } from "@syntheci/ai";
import {
  connectedAccounts,
  db,
  messages,
  sources,
  triageResults
} from "@syntheci/db";

import { logger } from "../logger";
import { decryptSecret } from "../utils/crypto";
import { indexMessageText } from "./indexing";

function createOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.APP_BASE_URL}/api/connect/google/callback`
  );
}

function decodeGmailBase64(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function findHeader(headers: Array<{ name?: string | null; value?: string | null }> | undefined, name: string) {
  return headers?.find((header) => header.name?.toLowerCase() === name.toLowerCase())?.value ?? null;
}

function extractTextFromPayload(payload: {
  body?: { data?: string | null };
  parts?: Array<{ mimeType?: string | null; body?: { data?: string | null } }>;
}) {
  if (payload.body?.data) {
    return decodeGmailBase64(payload.body.data);
  }

  for (const part of payload.parts ?? []) {
    if (part.mimeType === "text/plain" && part.body?.data) {
      return decodeGmailBase64(part.body.data);
    }
  }

  for (const part of payload.parts ?? []) {
    if (part.body?.data) {
      return decodeGmailBase64(part.body.data);
    }
  }

  return "";
}

async function getGoogleAccountWithSource(input: {
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
    throw new Error("Google connected account not found");
  }

  const source = await db.query.sources.findFirst({
    where: and(
      eq(sources.connectedAccountId, account.id),
      eq(sources.workspaceId, input.workspaceId),
      eq(sources.type, "gmail")
    )
  });

  if (!source) {
    throw new Error("Gmail source not found for connected account");
  }

  return {
    account,
    source
  };
}

function createGmailClient(account: typeof connectedAccounts.$inferSelect) {
  const oauth = createOAuthClient();
  oauth.setCredentials({
    access_token: decryptSecret(account.accessTokenCiphertext),
    refresh_token: account.refreshTokenCiphertext
      ? decryptSecret(account.refreshTokenCiphertext)
      : undefined
  });

  const gmail = google.gmail({
    version: "v1",
    auth: oauth
  });

  return gmail;
}

async function persistMessageFromGmail(input: {
  workspaceId: string;
  sourceId: string;
  gmail: ReturnType<typeof google.gmail>;
  externalMessageId: string;
}) {
  const full = await input.gmail.users.messages.get({
    userId: "me",
    id: input.externalMessageId,
    format: "full"
  });

  if (!full.data.id || !full.data.payload) {
    return null;
  }

  const headers = full.data.payload.headers ?? [];
  const subject = findHeader(headers, "subject");
  const from = findHeader(headers, "from");
  const dateHeader = findHeader(headers, "date");
  const textBody = extractTextFromPayload(full.data.payload);
  const isUnread = (full.data.labelIds ?? []).includes("UNREAD");
  const senderEmailMatch = from?.match(/<([^>]+)>/);
  const senderEmail = senderEmailMatch ? senderEmailMatch[1] : from ?? null;
  const senderName = senderEmailMatch
    ? from?.replace(senderEmailMatch[0], "").trim().replace(/^"|"$/g, "") || null
    : null;

  const [message] = await db
    .insert(messages)
    .values({
      workspaceId: input.workspaceId,
      sourceId: input.sourceId,
      externalMessageId: full.data.id,
      externalThreadId: full.data.threadId ?? null,
      senderName,
      senderEmail,
      subject: subject ?? null,
      textBody: textBody || "(empty)",
      htmlBody: null,
      deepLink: `https://mail.google.com/mail/u/0/#inbox/${full.data.id}`,
      receivedAt: dateHeader ? new Date(dateHeader) : new Date(),
      isUnread,
      isOpenThread: true,
      rawPayload: full.data as Record<string, unknown>
    })
    .onConflictDoUpdate({
      target: [messages.sourceId, messages.externalMessageId],
      set: {
        externalThreadId: full.data.threadId ?? null,
        senderName,
        senderEmail,
        subject: subject ?? null,
        textBody: textBody || "(empty)",
        receivedAt: dateHeader ? new Date(dateHeader) : new Date(),
        isUnread,
        rawPayload: full.data as Record<string, unknown>,
        updatedAt: new Date()
      }
    })
    .returning();

  await indexMessageText({
    workspaceId: input.workspaceId,
    sourceId: input.sourceId,
    messageId: message.id,
    text: message.textBody
  });

  const triage = await classifyMessageTriage({
    subject: message.subject,
    body: message.textBody,
    sender: message.senderEmail
  });

  await db
    .insert(triageResults)
    .values({
      workspaceId: input.workspaceId,
      messageId: message.id,
      label: triage.label,
      confidence: triage.confidence,
      rationale: triage.rationale,
      modelVersion: process.env.OPENAI_CHAT_MODEL ?? "gpt-4.1-mini"
    })
    .onConflictDoUpdate({
      target: triageResults.messageId,
      set: {
        label: triage.label,
        confidence: triage.confidence,
        rationale: triage.rationale,
        modelVersion: process.env.OPENAI_CHAT_MODEL ?? "gpt-4.1-mini",
        updatedAt: new Date()
      }
    });

  return message.id;
}

async function persistHistoryCursor(input: {
  accountId: string;
  existingMetadata: Record<string, unknown>;
  historyId: string | null | undefined;
}) {
  if (!input.historyId) {
    return;
  }

  await db
    .update(connectedAccounts)
    .set({
      metadata: {
        ...input.existingMetadata,
        lastHistoryId: input.historyId,
        lastSyncedAt: new Date().toISOString()
      },
      updatedAt: new Date()
    })
    .where(eq(connectedAccounts.id, input.accountId));
}

async function syncRecentInboxMessages(input: {
  workspaceId: string;
  sourceId: string;
  gmail: ReturnType<typeof google.gmail>;
}) {
  const listResponse = await input.gmail.users.messages.list({
    userId: "me",
    labelIds: ["INBOX"],
    maxResults: 25
  });

  const messageIds =
    listResponse.data.messages?.map((message) => message.id).filter(Boolean) ?? [];

  let processed = 0;
  for (const externalMessageId of messageIds as string[]) {
    const savedId = await persistMessageFromGmail({
      workspaceId: input.workspaceId,
      sourceId: input.sourceId,
      gmail: input.gmail,
      externalMessageId
    });
    if (savedId) {
      processed += 1;
    }
  }

  const profile = await input.gmail.users.getProfile({
    userId: "me"
  });

  return {
    processed,
    latestHistoryId: profile.data.historyId ?? null
  };
}

export async function ingestGmailNotification(input: {
  workspaceId: string;
  connectedAccountId: string;
  historyId: string;
}) {
  const { account, source } = await getGoogleAccountWithSource(input);
  const gmail = createGmailClient(account);

  const history = await gmail.users.history.list({
    userId: "me",
    startHistoryId: input.historyId,
    historyTypes: ["messageAdded"],
    maxResults: 50
  });

  const addedMessageRefs =
    history.data.history?.flatMap((item) => item.messagesAdded?.map((added) => added.message) ?? []) ??
    [];
  const messageIds = [...new Set(addedMessageRefs.map((message) => message?.id).filter(Boolean))] as string[];

  logger.info(
    {
      workspaceId: input.workspaceId,
      historyId: input.historyId,
      messageCount: messageIds.length
    },
    "Processing Gmail history notification"
  );

  for (const externalMessageId of messageIds) {
    await persistMessageFromGmail({
      workspaceId: input.workspaceId,
      sourceId: source.id,
      gmail,
      externalMessageId
    });
  }

  await persistHistoryCursor({
    accountId: account.id,
    existingMetadata: (account.metadata as Record<string, unknown>) ?? {},
    historyId: history.data.historyId
  });

  return {
    processed: messageIds.length
  };
}

export async function syncGmailAccount(input: {
  workspaceId: string;
  connectedAccountId: string;
}) {
  const { account, source } = await getGoogleAccountWithSource(input);
  const gmail = createGmailClient(account);
  const metadata = (account.metadata as Record<string, unknown>) ?? {};
  const lastHistoryId =
    typeof metadata.lastHistoryId === "string" && metadata.lastHistoryId.length > 0
      ? metadata.lastHistoryId
      : null;

  if (!lastHistoryId) {
    logger.info({ workspaceId: input.workspaceId, accountId: account.id }, "Running initial Gmail inbox sync");
    const initialSync = await syncRecentInboxMessages({
      workspaceId: input.workspaceId,
      sourceId: source.id,
      gmail
    });

    await persistHistoryCursor({
      accountId: account.id,
      existingMetadata: metadata,
      historyId: initialSync.latestHistoryId
    });

    return {
      mode: "initial",
      processed: initialSync.processed
    };
  }

  try {
    const incremental = await ingestGmailNotification({
      workspaceId: input.workspaceId,
      connectedAccountId: account.id,
      historyId: lastHistoryId
    });

    return {
      mode: "incremental",
      processed: incremental.processed
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.toLowerCase().includes("history")) {
      throw error;
    }

    logger.warn(
      { workspaceId: input.workspaceId, accountId: account.id, error: message },
      "Falling back to recent Gmail inbox sync"
    );

    const fallback = await syncRecentInboxMessages({
      workspaceId: input.workspaceId,
      sourceId: source.id,
      gmail
    });

    await persistHistoryCursor({
      accountId: account.id,
      existingMetadata: metadata,
      historyId: fallback.latestHistoryId
    });

    return {
      mode: "fallback",
      processed: fallback.processed
    };
  }
}
