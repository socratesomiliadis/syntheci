import { sql } from "drizzle-orm";

import { embedQuery } from "@syntheci/ai";
import { db } from "@syntheci/db";
import type { SourceType } from "@syntheci/shared";

const DEFAULT_CONTEXT_SOURCE_TYPES: SourceType[] = ["gmail", "note", "upload", "link"];

const actionIntentPattern =
  /\b(attention|priority|priorities|focus|first|reply|respond|approval|approve|sign[\s-]?off|send)\b/i;
const securityIntentPattern =
  /\b(security|sso|retention|regional|review|questionnaire|compliance|regulated)\b/i;
const commercialIntentPattern =
  /\b(commercial|proposal|renewal|pricing|discount|legal|procurement)\b/i;
const boardIntentPattern =
  /\b(board|preview|investor|pipeline|wins|narrative)\b/i;

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
  const normalizedQuestion = input.question.trim();
  const prioritizeAction = actionIntentPattern.test(normalizedQuestion);
  const prioritizeSecurity = securityIntentPattern.test(normalizedQuestion);
  const prioritizeCommercial = commercialIntentPattern.test(normalizedQuestion);
  const prioritizeBoard = boardIntentPattern.test(normalizedQuestion);
  const resolvedSourceTypes =
    input.sourceTypes && input.sourceTypes.length > 0
      ? input.sourceTypes
      : inferSourceTypesFromQuestion(input.question) ?? DEFAULT_CONTEXT_SOURCE_TYPES;
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
          (1 - (cc.embedding <=> ${vectorLiteral}::vector)) * 0.56 +
          ts_rank_cd(
            to_tsvector('simple', cc.content),
            websearch_to_tsquery('simple', ${input.question})
          ) * 0.16 +
          ts_rank_cd(
            to_tsvector(
              'simple',
              concat_ws(
                ' ',
                coalesce(m.subject, ''),
                coalesce(m.sender_name, ''),
                coalesce(m.sender_email, ''),
                coalesce(d.title, '')
              )
            ),
            websearch_to_tsquery('simple', ${input.question})
          ) * 0.16 +
          cc.rank_boost * 0.04 +
          case
            when ${prioritizeAction} and tr.label = 'urgent' then 0.12
            when ${prioritizeAction} and tr.label = 'needs_reply' then 0.1
            when ${prioritizeAction} and tr.label = 'follow_up' then 0.05
            else 0
          end +
          case when ${prioritizeAction} and coalesce(m.is_unread, false) then 0.03 else 0 end +
          case when ${prioritizeAction} and coalesce(m.is_open_thread, false) then 0.02 else 0 end +
          case
            when ${prioritizeSecurity} and (
              coalesce(m.subject, '') ilike '%security%' or
              coalesce(m.subject, '') ilike '%sso%' or
              coalesce(m.subject, '') ilike '%review%' or
              coalesce(d.title, '') ilike '%security%' or
              cc.content ilike '%security%' or
              cc.content ilike '%sso%' or
              cc.content ilike '%retention%' or
              cc.content ilike '%regional%'
            ) then 0.08
            else 0
          end +
          case
            when ${prioritizeCommercial} and (
              coalesce(m.subject, '') ilike '%proposal%' or
              coalesce(m.subject, '') ilike '%renewal%' or
              coalesce(m.subject, '') ilike '%commercial%' or
              coalesce(m.subject, '') ilike '%legal%' or
              coalesce(d.title, '') ilike '%procurement%' or
              cc.content ilike '%proposal%' or
              cc.content ilike '%renewal%' or
              cc.content ilike '%commercial%' or
              cc.content ilike '%procurement%'
            ) then 0.08
            else 0
          end +
          case
            when ${prioritizeBoard} and (
              coalesce(m.subject, '') ilike '%board%' or
              coalesce(m.subject, '') ilike '%preview%' or
              coalesce(m.subject, '') ilike '%pipeline%' or
              coalesce(d.title, '') ilike '%board%' or
              coalesce(d.title, '') ilike '%pipeline%' or
              cc.content ilike '%board%' or
              cc.content ilike '%pipeline%' or
              cc.content ilike '%customer wins%'
            ) then 0.08
            else 0
          end
        ) as score
      from content_chunks cc
      join sources s on s.id = cc.source_id
      left join messages m on m.id = cc.message_id
      left join documents d on d.id = cc.document_id
      left join triage_results tr on tr.message_id = cc.message_id
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
