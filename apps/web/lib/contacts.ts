import { and, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";

import { syncContactKnowledgeDocument } from "@syntheci/ai";
import {
  contacts,
  db,
  messages,
  normalizeContactEmail,
  upsertObservedContact
} from "@syntheci/db";

import { upsertSource } from "./connectors";

export type ContactRecord = typeof contacts.$inferSelect;

export async function ensureContactSource(workspaceId: string) {
  return upsertSource({
    workspaceId,
    type: "contact",
    displayName: "Workspace Contacts",
    metadata: {
      system: true
    }
  });
}

export async function syncContactKnowledge(contact: ContactRecord) {
  const source = await ensureContactSource(contact.workspaceId);
  await syncContactKnowledgeDocument({
    workspaceId: contact.workspaceId,
    sourceId: source.id,
    contact
  });

  return source;
}

export async function backfillContactsFromMessages(workspaceId: string) {
  const pendingMessages = await db.query.messages.findMany({
    where: and(
      eq(messages.workspaceId, workspaceId),
      isNotNull(messages.senderEmail),
      isNull(messages.senderContactId)
    ),
    columns: {
      id: true,
      senderName: true,
      senderEmail: true,
      receivedAt: true
    },
    orderBy: [desc(messages.receivedAt)],
    limit: 250
  });

  for (const message of pendingMessages) {
    if (!message.senderEmail) {
      continue;
    }

    const contact = await upsertObservedContact({
      workspaceId,
      name: message.senderName ?? null,
      email: message.senderEmail,
      origin: "gmail_sender",
      observedAt: message.receivedAt,
      lastMessageAt: message.receivedAt,
      metadata: {
        source: "gmail"
      }
    });

    if (!contact) {
      continue;
    }

    await syncContactKnowledge(contact);
    await db
      .update(messages)
      .set({
        senderContactId: contact.id,
        updatedAt: new Date()
      })
      .where(eq(messages.id, message.id));
  }

  return pendingMessages.length;
}

export async function listContactsWithStats(workspaceId: string) {
  const result = await db.execute(sql`
    select
      c.id,
      c.workspace_id,
      c.name,
      c.email,
      c.phone_number,
      c.company,
      c.role,
      c.notes,
      c.origin,
      c.metadata,
      c.first_seen_at,
      c.last_seen_at,
      c.last_message_at,
      c.created_at,
      c.updated_at,
      count(m.id)::int as message_count
    from contacts c
    left join messages m on m.sender_contact_id = c.id
    where c.workspace_id = ${workspaceId}
    group by c.id
    order by coalesce(c.last_message_at, c.updated_at) desc, c.created_at desc
  `);

  return result.rows.map((row) => ({
    id: String(row.id),
    workspaceId: String(row.workspace_id),
    name: row.name ? String(row.name) : null,
    email: row.email ? String(row.email) : null,
    phoneNumber: row.phone_number ? String(row.phone_number) : null,
    company: row.company ? String(row.company) : null,
    role: row.role ? String(row.role) : null,
    notes: row.notes ? String(row.notes) : null,
    origin: String(row.origin),
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    firstSeenAt: new Date(String(row.first_seen_at)),
    lastSeenAt: new Date(String(row.last_seen_at)),
    lastMessageAt: row.last_message_at ? new Date(String(row.last_message_at)) : null,
    createdAt: new Date(String(row.created_at)),
    updatedAt: new Date(String(row.updated_at)),
    messageCount: Number(row.message_count ?? 0)
  }));
}

export async function getContactCount(workspaceId: string) {
  const [result] = await db
    .select({
      count: sql<number>`count(*)::int`
    })
    .from(contacts)
    .where(eq(contacts.workspaceId, workspaceId));

  return Number(result?.count ?? 0);
}

export function normalizeManualContactEmail(email: string | null | undefined) {
  return normalizeContactEmail(email);
}
