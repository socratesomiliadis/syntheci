import { and, eq } from "drizzle-orm";

import { syncContactKnowledgeDocument } from "@syntheci/ai";
import { db, messages, sources, upsertObservedContact } from "@syntheci/db";

async function ensureContactSource(workspaceId: string) {
  const existing = await db.query.sources.findFirst({
    where: and(
      eq(sources.workspaceId, workspaceId),
      eq(sources.type, "contact"),
      eq(sources.displayName, "Workspace Contacts")
    )
  });

  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(sources)
    .values({
      workspaceId,
      type: "contact",
      displayName: "Workspace Contacts",
      metadata: {
        system: true
      }
    })
    .returning();

  return created;
}

export async function syncSenderContact(input: {
  workspaceId: string;
  senderName?: string | null;
  senderEmail?: string | null;
  receivedAt?: Date | null;
}) {
  if (!input.senderEmail) {
    return null;
  }

  const contact = await upsertObservedContact({
    workspaceId: input.workspaceId,
    name: input.senderName ?? null,
    email: input.senderEmail,
    origin: "gmail_sender",
    observedAt: input.receivedAt ?? new Date(),
    lastMessageAt: input.receivedAt ?? null,
    metadata: {
      source: "gmail"
    }
  });

  if (!contact) {
    return null;
  }

  const contactSource = await ensureContactSource(input.workspaceId);
  await syncContactKnowledgeDocument({
    workspaceId: input.workspaceId,
    sourceId: contactSource.id,
    contact
  });

  return contact;
}

export async function attachSenderContactToMessage(input: {
  messageId: string;
  senderContactId: string | null;
}) {
  await db
    .update(messages)
    .set({
      senderContactId: input.senderContactId,
      updatedAt: new Date()
    })
    .where(eq(messages.id, input.messageId));
}
