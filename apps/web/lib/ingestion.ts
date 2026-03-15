import { and, desc, eq, inArray } from "drizzle-orm";

import { db, documents, sources } from "@syntheci/db";

export interface IngestionDocumentItem {
  id: string;
  title: string;
  sourceType: "note" | "link" | "upload";
  rawText: string;
  noteBody: string | null;
  externalUrl: string | null;
  mimeType: string | null;
  createdAt: string;
}

export async function getIngestionDocuments(workspaceId: string): Promise<IngestionDocumentItem[]> {
  const rows = await db
    .select({
      id: documents.id,
      title: documents.title,
      sourceType: sources.type,
      rawText: documents.rawText,
      noteBody: documents.noteBody,
      externalUrl: documents.externalUrl,
      mimeType: documents.mimeType,
      createdAt: documents.createdAt
    })
    .from(documents)
    .innerJoin(sources, eq(documents.sourceId, sources.id))
    .where(and(eq(documents.workspaceId, workspaceId), inArray(sources.type, ["note", "link", "upload"])))
    .orderBy(desc(documents.createdAt));

  return rows.flatMap((row) => {
    if (row.sourceType !== "note" && row.sourceType !== "link" && row.sourceType !== "upload") {
      return [];
    }

    return [
      {
        id: row.id,
        title: row.title,
        sourceType: row.sourceType,
        rawText: row.rawText,
        noteBody: row.noteBody,
        externalUrl: row.externalUrl,
        mimeType: row.mimeType,
        createdAt: row.createdAt.toISOString()
      }
    ];
  });
}
