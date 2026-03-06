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

export async function ingestGmailNotification(input: {
  workspaceId: string;
  connectedAccountId: string;
  historyId: string;
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
    const full = await gmail.users.messages.get({
      userId: "me",
      id: externalMessageId,
      format: "full"
    });

    if (!full.data.id || !full.data.payload) {
      continue;
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
        sourceId: source.id,
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
      sourceId: source.id,
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
  }

  return {
    processed: messageIds.length
  };
}

export async function renewGmailWatch(input: {
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
    throw new Error("Google connected account not found for watch renewal");
  }

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

  const response = await gmail.users.watch({
    userId: "me",
    requestBody: {
      topicName: process.env.GOOGLE_PUBSUB_TOPIC,
      labelFilterBehavior: "include",
      labelIds: ["INBOX"]
    }
  });

  await db
    .update(connectedAccounts)
    .set({
      metadata: {
        ...(account.metadata as Record<string, unknown>),
        watchExpiration: response.data.expiration ?? null,
        watchHistoryId: response.data.historyId ?? null
      },
      updatedAt: new Date()
    })
    .where(eq(connectedAccounts.id, account.id));

  return response.data;
}
