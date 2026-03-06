import { and, eq } from "drizzle-orm";

import { classifyMessageTriage } from "@syntheci/ai";
import { db, messages, sources, triageResults } from "@syntheci/db";

import { indexMessageText } from "./indexing";

interface SlackMessageEvent {
  type?: string;
  user?: string;
  text?: string;
  ts?: string;
  channel?: string;
  thread_ts?: string;
  subtype?: string;
}

function slackTimestampToDate(ts: string | undefined) {
  if (!ts) return new Date();
  const millis = Number(ts) * 1000;
  if (!Number.isFinite(millis)) return new Date();
  return new Date(millis);
}

export async function ingestSlackEvent(input: {
  workspaceId: string;
  sourceId: string;
  event: Record<string, unknown>;
}) {
  const source = await db.query.sources.findFirst({
    where: and(eq(sources.id, input.sourceId), eq(sources.workspaceId, input.workspaceId))
  });
  if (!source) {
    throw new Error("Slack source not found");
  }

  const event = input.event as SlackMessageEvent;
  if (event.type !== "message" || event.subtype) {
    return {
      ignored: true
    };
  }

  const externalMessageId = event.ts ?? `${Date.now()}`;
  const textBody = event.text?.trim() || "(empty)";
  const receivedAt = slackTimestampToDate(event.ts);

  const [message] = await db
    .insert(messages)
    .values({
      workspaceId: input.workspaceId,
      sourceId: source.id,
      externalMessageId,
      externalThreadId: event.thread_ts ?? event.ts ?? null,
      senderName: null,
      senderEmail: event.user ?? null,
      subject: `Slack ${event.channel ?? "channel"} message`,
      textBody,
      htmlBody: null,
      deepLink: null,
      receivedAt,
      isUnread: true,
      isOpenThread: true,
      rawPayload: input.event
    })
    .onConflictDoUpdate({
      target: [messages.sourceId, messages.externalMessageId],
      set: {
        textBody,
        receivedAt,
        rawPayload: input.event,
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

  return {
    ignored: false,
    messageId: message.id
  };
}
