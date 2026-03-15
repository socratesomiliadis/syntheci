import { sql } from "drizzle-orm";

import { embedQuery } from "@syntheci/ai";
import { db } from "@syntheci/db";
import type { SourceType } from "@syntheci/shared";

const DEFAULT_CONTEXT_SOURCE_TYPES: SourceType[] = ["gmail", "note", "upload", "link"];
const RAW_CANDIDATE_MULTIPLIER = 4;
const MIN_RAW_CANDIDATES = 36;

const actionIntentPattern =
  /\b(attention|priority|priorities|focus|first|reply|respond|approval|approve|sign[\s-]?off|send)\b/i;
const securityIntentPattern =
  /\b(security|sso|retention|regional|review|questionnaire|compliance|regulated)\b/i;
const commercialIntentPattern =
  /\b(commercial|proposal|renewal|pricing|discount|legal|procurement)\b/i;
const boardIntentPattern =
  /\b(board|preview|investor|pipeline|wins|narrative)\b/i;
const artifactIntentPattern =
  /\b(send|share|attach|material|deck|doc|document|file|files|packet|pack|brief|outline|go into|before the review|what should i send)\b/i;
const multiEvidencePattern =
  /\b(blockers|risks|threads|priorities|materials|answers|dependencies|wins)\b/i;
const retrievalStopwords = new Set([
  "about",
  "after",
  "before",
  "from",
  "have",
  "into",
  "need",
  "should",
  "that",
  "their",
  "them",
  "they",
  "this",
  "what",
  "when",
  "which",
  "with",
  "your"
]);

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

interface RetrievalCandidate extends RetrievedChunk {
  score: number;
  subject: string | null;
  title: string | null;
}

interface RetrievalQueryProfile {
  sourceTypes: SourceType[];
  prioritizeAction: boolean;
  prioritizeSecurity: boolean;
  prioritizeCommercial: boolean;
  prioritizeBoard: boolean;
  prefersDocuments: boolean;
  needsMultipleEvidence: boolean;
  queryTokens: Set<string>;
  expansionTokens: Set<string>;
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

function tokenizeRetrievalText(text: string) {
  return (text.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter(
    (token) => token.length > 2 && !retrievalStopwords.has(token)
  );
}

function buildExpansionTokens(input: {
  prioritizeSecurity: boolean;
  prioritizeCommercial: boolean;
  prioritizeBoard: boolean;
  prefersDocuments: boolean;
  needsMultipleEvidence: boolean;
}) {
  const tokens = new Set<string>();

  if (input.prioritizeSecurity) {
    for (const token of ["security", "sso", "retention", "regional", "questionnaire", "controls"]) {
      tokens.add(token);
    }
  }

  if (input.prioritizeCommercial) {
    for (const token of ["proposal", "renewal", "procurement", "pricing", "discount", "approval"]) {
      tokens.add(token);
    }
  }

  if (input.prioritizeBoard) {
    for (const token of ["board", "preview", "pipeline", "wins", "deck", "narrative"]) {
      tokens.add(token);
    }
  }

  if (input.prefersDocuments) {
    for (const token of ["document", "deck", "brief", "answers", "summary"]) {
      tokens.add(token);
    }
  }

  if (input.needsMultipleEvidence) {
    for (const token of ["blockers", "dependencies", "risks", "answers"]) {
      tokens.add(token);
    }
  }

  return tokens;
}

export function buildRetrievalQueryProfile(question: string, sourceTypes?: SourceType[]) {
  const normalizedQuestion = question.trim();
  const prioritizeAction = actionIntentPattern.test(normalizedQuestion);
  const prioritizeSecurity = securityIntentPattern.test(normalizedQuestion);
  const prioritizeCommercial = commercialIntentPattern.test(normalizedQuestion);
  const prioritizeBoard = boardIntentPattern.test(normalizedQuestion);
  const prefersDocuments = artifactIntentPattern.test(normalizedQuestion);
  const needsMultipleEvidence =
    prefersDocuments ||
    multiEvidencePattern.test(normalizedQuestion) ||
    /\b(biggest|top|which|what are)\b/i.test(normalizedQuestion);
  const resolvedSourceTypes =
    sourceTypes && sourceTypes.length > 0
      ? sourceTypes
      : inferSourceTypesFromQuestion(question) ?? DEFAULT_CONTEXT_SOURCE_TYPES;

  return {
    sourceTypes: resolvedSourceTypes,
    prioritizeAction,
    prioritizeSecurity,
    prioritizeCommercial,
    prioritizeBoard,
    prefersDocuments,
    needsMultipleEvidence,
    queryTokens: new Set(tokenizeRetrievalText(normalizedQuestion)),
    expansionTokens: buildExpansionTokens({
      prioritizeSecurity,
      prioritizeCommercial,
      prioritizeBoard,
      prefersDocuments,
      needsMultipleEvidence
    })
  } satisfies RetrievalQueryProfile;
}

function candidateText(candidate: RetrievalCandidate) {
  return [candidate.subject ?? "", candidate.title ?? "", candidate.content].join("\n").toLowerCase();
}

function overlapScore(tokens: Set<string>, haystack: string, weight: number) {
  let score = 0;

  for (const token of tokens) {
    if (haystack.includes(token)) {
      score += weight;
    }
  }

  return score;
}

function sourcePreferenceScore(candidate: RetrievalCandidate, profile: RetrievalQueryProfile) {
  let score = 0;

  if (profile.prefersDocuments) {
    score += candidate.sourceType === "gmail" ? -0.015 : 0.08;
  }

  if (profile.prioritizeAction) {
    score += candidate.sourceType === "gmail" ? 0.05 : 0.015;
  }

  if ((profile.prioritizeSecurity || profile.prioritizeCommercial || profile.prioritizeBoard) && candidate.sourceType !== "gmail") {
    score += 0.04;
  }

  if (candidate.sourceType === "upload") {
    score += 0.015;
  }

  return score;
}

function rerankRetrievedChunks(
  candidates: RetrievalCandidate[],
  profile: RetrievalQueryProfile,
  limit: number
) {
  const uniqueCandidates = candidates.filter((candidate, index) => {
    return (
      candidates.findIndex(
        (other) => other.sourceType === candidate.sourceType && other.messageOrDocId === candidate.messageOrDocId
      ) === index
    );
  });

  const enriched = uniqueCandidates.map((candidate) => {
    const haystack = candidateText(candidate);
    return {
      candidate,
      rerankBase:
        candidate.score +
        overlapScore(profile.queryTokens, haystack, 0.018) +
        overlapScore(profile.expansionTokens, haystack, 0.012) +
        sourcePreferenceScore(candidate, profile)
    };
  });

  const selected: RetrievalCandidate[] = [];
  const remaining = [...enriched];

  while (selected.length < limit && remaining.length > 0) {
    let bestIndex = 0;
    let bestScore = Number.NEGATIVE_INFINITY;

    for (let index = 0; index < remaining.length; index += 1) {
      const current = remaining[index]!;
      const sourceTypeCount = selected.filter(
        (candidate) => candidate.sourceType === current.candidate.sourceType
      ).length;
      const hasDocumentAlready = selected.some((candidate) => candidate.sourceType !== "gmail");
      const hasSameThread = selected.some(
        (candidate) => candidate.messageOrDocId === current.candidate.messageOrDocId
      );

      let adjustedScore = current.rerankBase;
      adjustedScore -= sourceTypeCount * 0.035;

      if (profile.prefersDocuments && !hasDocumentAlready && current.candidate.sourceType !== "gmail") {
        adjustedScore += 0.1;
      }

      if (
        profile.needsMultipleEvidence &&
        !selected.some((candidate) => candidate.sourceType === current.candidate.sourceType)
      ) {
        adjustedScore += 0.05;
      }

      if (hasSameThread) {
        adjustedScore -= 0.25;
      }

      if (adjustedScore > bestScore) {
        bestScore = adjustedScore;
        bestIndex = index;
      }
    }

    const [best] = remaining.splice(bestIndex, 1);
    if (!best) {
      break;
    }

    selected.push(best.candidate);
  }

  return selected;
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
  const profile = buildRetrievalQueryProfile(input.question, input.sourceTypes);
  const sourceFilter = buildSourceFilter(profile.sourceTypes);
  const rawLimit = Math.max(limit * RAW_CANDIDATE_MULTIPLIER, MIN_RAW_CANDIDATES);

  const result = await db.execute(sql`
    with ranked as (
      select
        cc.id,
        s.type as source_type,
        cc.source_id,
        coalesce(cc.message_id::text, cc.document_id::text) as message_or_doc_id,
        cc.content,
        m.subject,
        d.title,
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
            when ${profile.prioritizeAction} and tr.label = 'urgent' then 0.12
            when ${profile.prioritizeAction} and tr.label = 'needs_reply' then 0.1
            when ${profile.prioritizeAction} and tr.label = 'follow_up' then 0.05
            else 0
          end +
          case when ${profile.prioritizeAction} and coalesce(m.is_unread, false) then 0.03 else 0 end +
          case when ${profile.prioritizeAction} and coalesce(m.is_open_thread, false) then 0.02 else 0 end +
          case
            when ${profile.prioritizeSecurity} and (
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
            when ${profile.prioritizeCommercial} and (
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
            when ${profile.prioritizeBoard} and (
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
    limit ${rawLimit}
  `);

  const candidates = result.rows.map((row) => ({
    id: String(row.id),
    sourceType: row.source_type as SourceType,
    sourceId: String(row.source_id),
    messageOrDocId: String(row.message_or_doc_id),
    content: String(row.content),
    subject: row.subject ? String(row.subject) : null,
    title: row.title ? String(row.title) : null,
    deepLink: row.deep_link ? String(row.deep_link) : null,
    score: Number(row.score)
  })) as RetrievalCandidate[];

  return rerankRetrievedChunks(candidates, profile, limit).map((candidate) => ({
    id: candidate.id,
    sourceType: candidate.sourceType,
    sourceId: candidate.sourceId,
    messageOrDocId: candidate.messageOrDocId,
    content: candidate.content,
    deepLink: candidate.deepLink
  }));
}
