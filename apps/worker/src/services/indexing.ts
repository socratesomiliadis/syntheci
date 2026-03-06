import { and, eq } from "drizzle-orm";

import { embedTexts } from "@syntheci/ai";
import { contentChunks, db } from "@syntheci/db";

import { chunkText } from "../utils/chunk";

export async function indexDocumentText(input: {
  workspaceId: string;
  sourceId: string;
  documentId: string;
  text: string;
}) {
  const chunks = chunkText(input.text);
  if (chunks.length === 0) {
    return 0;
  }

  await db
    .delete(contentChunks)
    .where(
      and(
        eq(contentChunks.workspaceId, input.workspaceId),
        eq(contentChunks.documentId, input.documentId)
      )
    );

  const embeddings = await embedTexts(chunks.map((chunk) => chunk.content));
  if (embeddings.length !== chunks.length) {
    throw new Error("Embedding count mismatch for document indexing");
  }

  await db.insert(contentChunks).values(
    chunks.map((chunk, idx) => ({
      workspaceId: input.workspaceId,
      sourceId: input.sourceId,
      documentId: input.documentId,
      content: chunk.content,
      tokenCount: chunk.tokenCount,
      embedding: embeddings[idx],
      rankBoost: 1
    }))
  );

  return chunks.length;
}

export async function indexMessageText(input: {
  workspaceId: string;
  sourceId: string;
  messageId: string;
  text: string;
}) {
  const chunks = chunkText(input.text);
  if (chunks.length === 0) {
    return 0;
  }

  await db
    .delete(contentChunks)
    .where(
      and(eq(contentChunks.workspaceId, input.workspaceId), eq(contentChunks.messageId, input.messageId))
    );

  const embeddings = await embedTexts(chunks.map((chunk) => chunk.content));
  if (embeddings.length !== chunks.length) {
    throw new Error("Embedding count mismatch for message indexing");
  }

  await db.insert(contentChunks).values(
    chunks.map((chunk, idx) => ({
      workspaceId: input.workspaceId,
      sourceId: input.sourceId,
      messageId: input.messageId,
      content: chunk.content,
      tokenCount: chunk.tokenCount,
      embedding: embeddings[idx],
      rankBoost: 1.1
    }))
  );

  return chunks.length;
}
