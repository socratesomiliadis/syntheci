import { and, contentChunks, contacts, db, documents, eq } from "@syntheci/db";

import { embedTexts } from "./embeddings";

function estimateTokenCount(text: string) {
  return Math.max(1, Math.ceil(text.length / 4));
}

function contactTitle(contact: typeof contacts.$inferSelect) {
  return contact.name?.trim() || contact.email?.trim() || "Unnamed contact";
}

export function buildContactProfileText(contact: typeof contacts.$inferSelect) {
  const sections = [
    `Contact: ${contactTitle(contact)}`,
    contact.email ? `Email: ${contact.email}` : null,
    contact.phoneNumber ? `Phone: ${contact.phoneNumber}` : null,
    contact.company ? `Company: ${contact.company}` : null,
    contact.role ? `Role: ${contact.role}` : null,
    contact.notes ? `Notes: ${contact.notes}` : null,
    `Origin: ${contact.origin}`,
    contact.lastMessageAt ? `Last message: ${contact.lastMessageAt.toISOString()}` : null
  ].filter((section): section is string => Boolean(section && section.trim()));

  return sections.join("\n");
}

export async function syncContactKnowledgeDocument(input: {
  workspaceId: string;
  sourceId: string;
  contact: typeof contacts.$inferSelect;
}) {
  const rawText = buildContactProfileText(input.contact);
  const title = contactTitle(input.contact);
  const externalUrl = `/dashboard/contacts?contact=${input.contact.id}`;

  const existingDocument = await db.query.documents.findFirst({
    where: and(
      eq(documents.workspaceId, input.workspaceId),
      eq(documents.contactId, input.contact.id)
    )
  });

  const [document] = existingDocument
    ? await db
        .update(documents)
        .set({
          sourceId: input.sourceId,
          title,
          externalUrl,
          rawText,
          metadata: {
            contactId: input.contact.id,
            origin: input.contact.origin
          },
          updatedAt: new Date()
        })
        .where(eq(documents.id, existingDocument.id))
        .returning()
    : await db
        .insert(documents)
        .values({
          workspaceId: input.workspaceId,
          sourceId: input.sourceId,
          contactId: input.contact.id,
          title,
          externalUrl,
          rawText,
          metadata: {
            contactId: input.contact.id,
            origin: input.contact.origin
          }
        })
        .returning();

  await db
    .delete(contentChunks)
    .where(
      and(
        eq(contentChunks.workspaceId, input.workspaceId),
        eq(contentChunks.documentId, document.id)
      )
    );

  if (!rawText.trim()) {
    return document;
  }

  const [embedding] = await embedTexts([rawText]);
  await db.insert(contentChunks).values({
    workspaceId: input.workspaceId,
    sourceId: input.sourceId,
    documentId: document.id,
    content: rawText,
    tokenCount: estimateTokenCount(rawText),
    embedding,
    rankBoost: 1.2
  });

  return document;
}
