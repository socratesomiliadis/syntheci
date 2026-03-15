import { sql } from "drizzle-orm";

import { embedQuery } from "@syntheci/ai";
import { db } from "@syntheci/db";
import type { SourceType } from "@syntheci/shared";

function toVectorLiteral(embedding: number[]) {
  return `[${embedding.join(",")}]`;
}

export interface RetrievedChunk {
  id: string;
  sourceType: SourceType;
  sourceId: string;
  messageOrDocId: string;
  content: string;
  deepLink: string | null;
}

const inferredSourceIntentPatterns: Array<{
  sourceType: SourceType;
  pattern: RegExp;
}> = [
  {
    sourceType: "contact",
    pattern: /\b(contact|contacts|address book)\b/i
  },
  {
    sourceType: "note",
    pattern: /\b(note|notes)\b/i
  },
  {
    sourceType: "upload",
    pattern: /\b(upload|uploads|file|files|pdf|pdfs|document|documents|attachment|attachments)\b/i
  },
  {
    sourceType: "link",
    pattern: /\b(link|links|url|urls|website|websites|webpage|web page|article|articles)\b/i
  },
  {
    sourceType: "gmail",
    pattern: /\b(email|emails|gmail|inbox|thread|threads)\b/i
  }
];

export function buildSourceFilter(sourceTypes?: SourceType[]) {
  if (!sourceTypes || sourceTypes.length === 0) {
    return sql``;
  }

  return sql`and s.type in (${sql.join(
    sourceTypes.map((sourceType) => sql`${sourceType}`),
    sql`, `
  )})`;
}

export function inferSourceTypesFromQuestion(question: string) {
  const normalized = question.trim();
  if (!normalized) {
    return undefined;
  }

  const inferred = inferredSourceIntentPatterns
    .filter(({ pattern }) => pattern.test(normalized))
    .map(({ sourceType }) => sourceType);

  return inferred.length > 0 ? [...new Set(inferred)] : undefined;
}

export async function retrieveContextChunks(input: {
  workspaceId: string;
  question: string;
  sourceTypes?: SourceType[];
  limit?: number;
}) {
  const embedding = await embedQuery(input.question);
  const vectorLiteral = toVectorLiteral(embedding);
  const limit = input.limit ?? 12;
  const resolvedSourceTypes =
    input.sourceTypes && input.sourceTypes.length > 0
      ? input.sourceTypes
      : inferSourceTypesFromQuestion(input.question);
  const sourceFilter = buildSourceFilter(resolvedSourceTypes);

  const result = await db.execute(sql`
    with ranked as (
      select
        cc.id,
        s.type as source_type,
        cc.source_id,
        coalesce(cc.message_id::text, cc.document_id::text) as message_or_doc_id,
        cc.content,
        coalesce(m.deep_link, d.external_url) as deep_link,
        (
          (1 - (cc.embedding <=> ${vectorLiteral}::vector)) * 0.72 +
          ts_rank_cd(
            to_tsvector('simple', cc.content),
            plainto_tsquery('simple', ${input.question})
          ) * 0.23 +
          cc.rank_boost * 0.05
        ) as score
      from content_chunks cc
      join sources s on s.id = cc.source_id
      left join messages m on m.id = cc.message_id
      left join documents d on d.id = cc.document_id
      where cc.workspace_id = ${input.workspaceId}
      ${sourceFilter}
    )
    select * from ranked
    order by score desc
    limit ${limit}
  `);

  return result.rows.map((row) => ({
    id: String(row.id),
    sourceType: row.source_type as SourceType,
    sourceId: String(row.source_id),
    messageOrDocId: String(row.message_or_doc_id),
    content: String(row.content),
    deepLink: row.deep_link ? String(row.deep_link) : null
  })) as RetrievedChunk[];
}
