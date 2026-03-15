import crypto, { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { and, eq, inArray } from "drizzle-orm";

import { embedTexts, syncContactKnowledgeDocument } from "@syntheci/ai";
import {
  briefings,
  chatConversations,
  chatMessages,
  connectedAccounts,
  contacts,
  contentChunks,
  db,
  documents,
  draftReplies,
  memberships,
  meetingProposals,
  messages,
  pool,
  schema,
  sources,
  triageResults,
  users,
  upsertObservedContact,
  workspaces
} from "@syntheci/db";
import {
  buildDemoConnectedAccountMetadata,
  chunkText,
  demoBriefing,
  demoChatConversations,
  demoConnectorLabel,
  demoContacts,
  demoInitialEmails,
  demoLinks,
  demoMeetings,
  demoNotes,
  demoUploads,
  demoWorkspaceName,
  demoWorkspaceTimezone,
  type DemoReferenceFixture
} from "@syntheci/shared";

const env = {
  BETTER_AUTH_SECRET:
    process.env.BETTER_AUTH_SECRET ?? "replace-with-long-random-secret-and-rotate",
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  DEMO_MODE_ENABLED: (process.env.DEMO_MODE_ENABLED ?? "true") !== "false",
  DEMO_ACCOUNT_EMAIL: process.env.DEMO_ACCOUNT_EMAIL ?? "demo@syntheci.local",
  DEMO_ACCOUNT_PASSWORD: process.env.DEMO_ACCOUNT_PASSWORD ?? "demo-password-123",
  DEMO_ACCOUNT_NAME: process.env.DEMO_ACCOUNT_NAME ?? "Syntheci Demo"
};

const encryptionKey = crypto
  .createHash("sha256")
  .update(env.BETTER_AUTH_SECRET, "utf8")
  .digest();

function encryptSecret(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

const seedAuth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  advanced: {
    generateId: () => randomUUID()
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.authUsers,
      session: schema.authSessions,
      account: schema.authAccounts,
      verification: schema.authVerifications
    }
  }),
  emailAndPassword: {
    enabled: true
  }
});

const bootstrapSchemaSql = `
DO $$
BEGIN
  CREATE TYPE chat_message_role AS ENUM ('user', 'assistant', 'system');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE source_type ADD VALUE IF NOT EXISTS 'contact';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_conversations_workspace_id_idx ON chat_conversations(workspace_id);
CREATE INDEX IF NOT EXISTS chat_conversations_user_id_idx ON chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS chat_conversations_updated_at_idx ON chat_conversations(updated_at DESC);

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  client_message_id text,
  role chat_message_role NOT NULL,
  parts jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_types source_type[] NOT NULL DEFAULT '{}'::source_type[],
  citations jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, client_message_id)
);

CREATE INDEX IF NOT EXISTS chat_messages_conversation_id_idx ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS chat_messages_created_at_idx ON chat_messages(created_at);

CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text,
  email text,
  phone_number text,
  company text,
  role text,
  notes text,
  origin text NOT NULL DEFAULT 'manual',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, email)
);

CREATE INDEX IF NOT EXISTS contacts_workspace_id_idx ON contacts(workspace_id);
CREATE INDEX IF NOT EXISTS contacts_email_idx ON contacts(email);
CREATE INDEX IF NOT EXISTS contacts_last_message_at_idx ON contacts(last_message_at DESC);

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS sender_contact_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'messages_sender_contact_id_contacts_id_fk'
  ) THEN
    ALTER TABLE messages
      ADD CONSTRAINT messages_sender_contact_id_contacts_id_fk
      FOREIGN KEY (sender_contact_id)
      REFERENCES contacts(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS messages_sender_contact_id_idx ON messages(sender_contact_id);

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS contact_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'documents_contact_id_contacts_id_fk'
  ) THEN
    ALTER TABLE documents
      ADD CONSTRAINT documents_contact_id_contacts_id_fk
      FOREIGN KEY (contact_id)
      REFERENCES contacts(id)
      ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'documents_contact_unique'
  ) THEN
    ALTER TABLE documents
      ADD CONSTRAINT documents_contact_unique UNIQUE(contact_id);
  END IF;
END $$;
`;

const demoScopes = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/calendar.events"
];

const s3 = new S3Client({
  region: process.env.MINIO_REGION ?? "us-east-1",
  endpoint: process.env.MINIO_ENDPOINT ?? "http://localhost:9000",
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY ?? "minioadmin",
    secretAccessKey: process.env.MINIO_SECRET_KEY ?? "minioadmin"
  }
});

interface SeededMessageRecord {
  id: string;
  sourceId: string;
  subject: string | null;
  textBody: string;
  deepLink: string | null;
}

interface SeededDocumentRecord {
  id: string;
  sourceId: string;
  title: string;
  rawText: string;
  externalUrl: string | null;
}

export interface BootstrapDemoSeedResult {
  workspaceId: string;
  connectedAccountId: string;
  sources: {
    gmail: string;
    note: string;
    link: string;
    upload: string;
    contact: string;
  };
  messages: number;
  documents: number;
  contacts: number;
  drafts: string[];
  meetings: number;
}

function log(message: string, data?: object) {
  if (data) {
    console.log(`[bootstrap-demo] ${message}`, data);
    return;
  }

  console.log(`[bootstrap-demo] ${message}`);
}

async function ensureBootstrapSchema() {
  await pool.query(bootstrapSchemaSql);
}

async function ensureDemoAuthUser() {
  const authContext = await seedAuth.$context;
  let existing = await authContext.internalAdapter.findUserByEmail(env.DEMO_ACCOUNT_EMAIL, {
    includeAccounts: true
  });

  if (!existing) {
    await seedAuth.api.signUpEmail({
      body: {
        name: env.DEMO_ACCOUNT_NAME,
        email: env.DEMO_ACCOUNT_EMAIL,
        password: env.DEMO_ACCOUNT_PASSWORD
      }
    });

    existing = await authContext.internalAdapter.findUserByEmail(env.DEMO_ACCOUNT_EMAIL, {
      includeAccounts: true
    });
  }

  if (!existing) {
    throw new Error("Failed to create demo auth user");
  }

  const hashedPassword = await authContext.password.hash(env.DEMO_ACCOUNT_PASSWORD);
  const credentialAccount = existing.accounts.find((account) => account.providerId === "credential");

  await authContext.internalAdapter.updateUser(existing.user.id, {
    name: env.DEMO_ACCOUNT_NAME
  });

  if (credentialAccount) {
    await authContext.internalAdapter.updatePassword(existing.user.id, hashedPassword);
  } else {
    await authContext.internalAdapter.createAccount({
      userId: existing.user.id,
      providerId: "credential",
      accountId: existing.user.id,
      password: hashedPassword
    });
  }

  return {
    ...existing.user,
    name: env.DEMO_ACCOUNT_NAME
  };
}

async function resetDemoWorkspace(userId: string) {
  await db
    .insert(users)
    .values({
      id: userId,
      email: env.DEMO_ACCOUNT_EMAIL,
      name: env.DEMO_ACCOUNT_NAME,
      imageUrl: null
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        email: env.DEMO_ACCOUNT_EMAIL,
        name: env.DEMO_ACCOUNT_NAME,
        imageUrl: null,
        updatedAt: new Date()
      }
    });

  const existingMemberships = await db.query.memberships.findMany({
    where: eq(memberships.userId, userId),
    columns: {
      workspaceId: true
    }
  });

  const workspaceIds = existingMemberships.map((membership) => membership.workspaceId);
  if (workspaceIds.length > 0) {
    await db.delete(workspaces).where(inArray(workspaces.id, workspaceIds));
  }

  const [workspace] = await db
    .insert(workspaces)
    .values({
      ownerUserId: userId,
      name: demoWorkspaceName,
      timezone: demoWorkspaceTimezone
    })
    .returning({
      id: workspaces.id
    });

  await db.insert(memberships).values({
    workspaceId: workspace.id,
    userId,
    role: "owner"
  });

  return workspace.id;
}

async function createDemoSource(input: {
  workspaceId: string;
  connectedAccountId?: string | null;
  type: "gmail" | "note" | "upload" | "link" | "contact";
  displayName: string;
  externalSourceId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const [source] = await db
    .insert(sources)
    .values({
      workspaceId: input.workspaceId,
      connectedAccountId: input.connectedAccountId ?? null,
      type: input.type,
      externalSourceId: input.externalSourceId ?? null,
      displayName: input.displayName,
      metadata: input.metadata ?? {}
    })
    .returning();

  return source;
}

async function indexDocumentText(input: {
  workspaceId: string;
  sourceId: string;
  documentId: string;
  text: string;
}) {
  const chunks = chunkText(input.text);
  if (chunks.length === 0) {
    return 0;
  }

  const embeddings = await embedTexts(chunks.map((chunk) => chunk.content));
  await db.insert(contentChunks).values(
    chunks.map((chunk, index) => ({
      workspaceId: input.workspaceId,
      sourceId: input.sourceId,
      documentId: input.documentId,
      content: chunk.content,
      tokenCount: chunk.tokenCount,
      embedding: embeddings[index],
      rankBoost: 1
    }))
  );

  return chunks.length;
}

async function indexMessageText(input: {
  workspaceId: string;
  sourceId: string;
  messageId: string;
  text: string;
}) {
  const chunks = chunkText(input.text);
  if (chunks.length === 0) {
    return 0;
  }

  const embeddings = await embedTexts(chunks.map((chunk) => chunk.content));
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

async function uploadDemoAsset(objectKey: string, body: string, contentType: string) {
  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.MINIO_BUCKET ?? "syntheci-files",
      Key: objectKey,
      Body: body,
      ContentType: contentType
    })
  );
}

function buildUploadPublicUrl(objectKey: string) {
  return `${process.env.MINIO_PUBLIC_URL ?? "http://localhost:9000"}/${process.env.MINIO_BUCKET ?? "syntheci-files"}/${objectKey}`;
}

function citationSnippet(text: string) {
  return text.replace(/\s+/g, " ").trim().slice(0, 180);
}

function uniqueSourceTypes(refs: DemoReferenceFixture[] | undefined) {
  return [...new Set((refs ?? []).map((ref) => ref.sourceType))];
}

async function seedWorkspaceData(
  input: { workspaceId: string; userId: string }
): Promise<BootstrapDemoSeedResult> {
  const [demoAccount] = await db
    .insert(connectedAccounts)
    .values({
      workspaceId: input.workspaceId,
      userId: input.userId,
      provider: "google",
      externalAccountId: env.DEMO_ACCOUNT_EMAIL,
      scopes: demoScopes,
      accessTokenCiphertext: encryptSecret("demo-access-token"),
      refreshTokenCiphertext: encryptSecret("demo-refresh-token"),
      tokenExpiresAt: new Date("2026-12-31T00:00:00.000Z"),
      metadata: buildDemoConnectedAccountMetadata()
    })
    .returning();

  const gmailSource = await createDemoSource({
    workspaceId: input.workspaceId,
    connectedAccountId: demoAccount.id,
    type: "gmail",
    displayName: demoConnectorLabel,
    externalSourceId: "demo-gmail",
    metadata: {
      demo: true
    }
  });
  const noteSource = await createDemoSource({
    workspaceId: input.workspaceId,
    type: "note",
    displayName: "Demo Notes"
  });
  const linkSource = await createDemoSource({
    workspaceId: input.workspaceId,
    type: "link",
    displayName: "Demo Links"
  });
  const uploadSource = await createDemoSource({
    workspaceId: input.workspaceId,
    type: "upload",
    displayName: "Demo Uploads"
  });
  const contactSource = await createDemoSource({
    workspaceId: input.workspaceId,
    type: "contact",
    displayName: "Workspace Contacts",
    metadata: {
      system: true,
      demo: true
    }
  });

  for (const contactFixture of demoContacts) {
    await db
      .insert(contacts)
      .values({
        workspaceId: input.workspaceId,
        name: contactFixture.name,
        email: contactFixture.email,
        phoneNumber: contactFixture.phoneNumber ?? null,
        company: contactFixture.company ?? null,
        role: contactFixture.role ?? null,
        notes: contactFixture.notes ?? null,
        origin: contactFixture.origin ?? "manual",
        metadata: {
          demo: true,
          key: contactFixture.key
        }
      })
      .onConflictDoUpdate({
        target: [contacts.workspaceId, contacts.email],
        set: {
          name: contactFixture.name,
          phoneNumber: contactFixture.phoneNumber ?? null,
          company: contactFixture.company ?? null,
          role: contactFixture.role ?? null,
          notes: contactFixture.notes ?? null,
          origin: contactFixture.origin ?? "manual",
          metadata: {
            demo: true,
            key: contactFixture.key
          },
          updatedAt: new Date()
        }
      });
  }

  const messageRecords = new Map<string, SeededMessageRecord>();

  for (const fixture of demoInitialEmails) {
    const contact = await upsertObservedContact({
      workspaceId: input.workspaceId,
      name: fixture.senderName,
      email: fixture.senderEmail,
      origin: "gmail_sender",
      observedAt: new Date(fixture.receivedAt),
      lastMessageAt: new Date(fixture.receivedAt),
      metadata: {
        demo: true,
        source: "demo_gmail"
      }
    });

    const [message] = await db
      .insert(messages)
      .values({
        workspaceId: input.workspaceId,
        sourceId: gmailSource.id,
        senderContactId: contact?.id ?? null,
        externalMessageId: fixture.externalMessageId,
        externalThreadId: fixture.externalThreadId,
        senderName: fixture.senderName,
        senderEmail: fixture.senderEmail,
        subject: fixture.subject,
        textBody: fixture.textBody,
        htmlBody: fixture.htmlBody ?? null,
        deepLink:
          fixture.deepLink ?? `https://mail.google.com/mail/u/0/#inbox/${fixture.externalMessageId}`,
        receivedAt: new Date(fixture.receivedAt),
        isUnread: fixture.isUnread,
        isOpenThread: fixture.isOpenThread ?? true,
        rawPayload: {
          demo: true,
          fixtureKey: fixture.key
        }
      })
      .returning({
        id: messages.id,
        sourceId: messages.sourceId,
        subject: messages.subject,
        textBody: messages.textBody,
        deepLink: messages.deepLink
      });

    await db.insert(triageResults).values({
      workspaceId: input.workspaceId,
      messageId: message.id,
      label: fixture.triage.label,
      confidence: fixture.triage.confidence,
      rationale: fixture.triage.rationale,
      modelVersion: "demo-seeded"
    });

    await indexMessageText({
      workspaceId: input.workspaceId,
      sourceId: gmailSource.id,
      messageId: message.id,
      text: fixture.textBody
    });

    messageRecords.set(fixture.key, message);
  }

  const documentRecords = new Map<string, SeededDocumentRecord>();

  for (const note of demoNotes) {
    const [document] = await db
      .insert(documents)
      .values({
        workspaceId: input.workspaceId,
        sourceId: noteSource.id,
        title: note.title,
        noteBody: note.body,
        rawText: note.body,
        metadata: {
          demo: true,
          key: note.key,
          status: "note_created"
        }
      })
      .returning({
        id: documents.id,
        sourceId: documents.sourceId,
        title: documents.title,
        rawText: documents.rawText,
        externalUrl: documents.externalUrl
      });

    await indexDocumentText({
      workspaceId: input.workspaceId,
      sourceId: noteSource.id,
      documentId: document.id,
      text: note.body
    });

    documentRecords.set(note.key, document);
  }

  for (const link of demoLinks) {
    const [document] = await db
      .insert(documents)
      .values({
        workspaceId: input.workspaceId,
        sourceId: linkSource.id,
        title: link.title,
        externalUrl: link.url,
        rawText: link.rawText,
        metadata: {
          demo: true,
          key: link.key,
          status: "link_ready"
        }
      })
      .returning({
        id: documents.id,
        sourceId: documents.sourceId,
        title: documents.title,
        rawText: documents.rawText,
        externalUrl: documents.externalUrl
      });

    await indexDocumentText({
      workspaceId: input.workspaceId,
      sourceId: linkSource.id,
      documentId: document.id,
      text: link.rawText
    });

    documentRecords.set(link.key, document);
  }

  for (const upload of demoUploads) {
    const objectKey = `demo/${upload.fileName}`;
    await uploadDemoAsset(objectKey, upload.objectBody, upload.mimeType);

    const [document] = await db
      .insert(documents)
      .values({
        workspaceId: input.workspaceId,
        sourceId: uploadSource.id,
        title: upload.title,
        mimeType: upload.mimeType,
        objectKey,
        externalUrl: buildUploadPublicUrl(objectKey),
        rawText: upload.rawText,
        metadata: {
          demo: true,
          key: upload.key,
          status: "uploaded"
        }
      })
      .returning({
        id: documents.id,
        sourceId: documents.sourceId,
        title: documents.title,
        rawText: documents.rawText,
        externalUrl: documents.externalUrl
      });

    await indexDocumentText({
      workspaceId: input.workspaceId,
      sourceId: uploadSource.id,
      documentId: document.id,
      text: upload.rawText
    });

    documentRecords.set(upload.key, document);
  }

  const workspaceContacts = await db.query.contacts.findMany({
    where: eq(contacts.workspaceId, input.workspaceId)
  });

  for (const contact of workspaceContacts) {
    await syncContactKnowledgeDocument({
      workspaceId: input.workspaceId,
      sourceId: contactSource.id,
      contact
    });
  }

  const [generatedDraft] = await db
    .insert(draftReplies)
    .values({
      workspaceId: input.workspaceId,
      messageId: messageRecords.get("vectorops-proposal")!.id,
      tone: "clear and confident",
      instructions: "Approve the commercial changes and confirm legal handoff.",
      body:
        "Hi Lena,\n\nThe updated proposal looks good from my side. Please send the final version to legal tomorrow morning and keep me posted on any redlines that change the commercial guardrails.\n\nThanks,\nSyntheci",
      status: "generated"
    })
    .returning();

  const [approvedDraft] = await db
    .insert(draftReplies)
    .values({
      workspaceId: input.workspaceId,
      messageId: messageRecords.get("apollo-launch")!.id,
      tone: "executive concise",
      instructions: "Summarize launch blockers and tonight's plan.",
      body:
        "Hi Nina,\n\nWe are on track to send the launch readiness summary by 19:00. The only material blockers are legal sign-off on the revised order form and final review of the APAC onboarding runbook. I will include owner-by-owner next steps in the update.\n\nBest,\nSyntheci",
      status: "approved"
    })
    .returning();

  const meetingRecords = new Map<string, { id: string; externalEventId: string | null }>();
  for (const meeting of demoMeetings) {
    const [proposal] = await db
      .insert(meetingProposals)
      .values({
        workspaceId: input.workspaceId,
        sourceMessageId: messageRecords.get(meeting.sourceMessageKey)!.id,
        title: meeting.title,
        description: meeting.description,
        timezone: meeting.timezone,
        startsAt: new Date(meeting.startsAt),
        endsAt: new Date(meeting.endsAt),
        attendees: meeting.attendees,
        status: meeting.status,
        externalEventId: meeting.externalEventId ?? null
      })
      .returning({
        id: meetingProposals.id,
        externalEventId: meetingProposals.externalEventId
      });

    meetingRecords.set(meeting.key, proposal);
  }

  const briefingItems = demoBriefing.items.map((item) => ({
    type: item.type,
    title: item.title,
    reason: item.reason,
    sourceRefs: item.refs.map((ref) => {
      const message = messageRecords.get(ref.key);
      const document = documentRecords.get(ref.key);
      const record = message ?? document;

      if (!record) {
        throw new Error(`Missing briefing reference for ${ref.sourceType}:${ref.key}`);
      }

      return {
        sourceType: ref.sourceType,
        sourceId: record.sourceId,
        messageOrDocId: record.id
      };
    })
  }));

  await db.insert(briefings).values({
    workspaceId: input.workspaceId,
    briefingDate: demoBriefing.briefingDate,
    summary: demoBriefing.summary,
    items: briefingItems,
    generatedAt: new Date("2026-03-15T07:45:00.000Z")
  });

  function resolveCitation(ref: DemoReferenceFixture) {
    const message = messageRecords.get(ref.key);
    if (message) {
      return {
        sourceType: ref.sourceType,
        sourceId: message.sourceId,
        messageOrDocId: message.id,
        snippet: citationSnippet(message.textBody),
        startOffset: 0,
        endOffset: Math.min(message.textBody.length, 180),
        deepLink: message.deepLink
      };
    }

    const document = documentRecords.get(ref.key);
    if (document) {
      return {
        sourceType: ref.sourceType,
        sourceId: document.sourceId,
        messageOrDocId: document.id,
        snippet: citationSnippet(document.rawText),
        startOffset: 0,
        endOffset: Math.min(document.rawText.length, 180),
        deepLink: document.externalUrl
      };
    }

    throw new Error(`Missing citation reference for ${ref.sourceType}:${ref.key}`);
  }

  for (const conversationFixture of demoChatConversations) {
    const [conversation] = await db
      .insert(chatConversations)
      .values({
        workspaceId: input.workspaceId,
        userId: input.userId,
        title: conversationFixture.title
      })
      .returning({
        id: chatConversations.id
      });

    for (let index = 0; index < conversationFixture.messages.length; index += 1) {
      const message = conversationFixture.messages[index]!;
      const citations = (message.refs ?? []).map(resolveCitation);

      await db.insert(chatMessages).values({
        conversationId: conversation.id,
        clientMessageId: message.role === "user" ? `seed-${conversationFixture.key}-${index}` : null,
        role: message.role,
        parts: [
          {
            type: "text",
            text: message.text
          }
        ],
        sourceTypes: uniqueSourceTypes(message.refs),
        citations
      });
    }
  }

  return {
    workspaceId: input.workspaceId,
    connectedAccountId: demoAccount.id,
    sources: {
      gmail: gmailSource.id,
      note: noteSource.id,
      link: linkSource.id,
      upload: uploadSource.id,
      contact: contactSource.id
    },
    messages: messageRecords.size,
    documents: documentRecords.size,
    contacts: workspaceContacts.length,
    drafts: [generatedDraft.id, approvedDraft.id],
    meetings: meetingRecords.size
  };
}

export async function bootstrapDemoWorkspace() {
  if (!env.DEMO_MODE_ENABLED) {
    log("Demo mode disabled, skipping bootstrap.");
    return null;
  }

  await ensureBootstrapSchema();
  const demoUser = await ensureDemoAuthUser();
  const workspaceId = await resetDemoWorkspace(demoUser.id);
  const result = await seedWorkspaceData({
    workspaceId,
    userId: demoUser.id
  });

  log("Demo workspace ready.", result);
  return result;
}

export async function runBootstrapDemoCli() {
  try {
    await bootstrapDemoWorkspace();
  } catch (error) {
    console.error("[bootstrap-demo] Failed to bootstrap demo workspace", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

const isDirectExecution =
  process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  void runBootstrapDemoCli();
}
