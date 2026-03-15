import { and, asc, desc, eq, gte, inArray, sql } from "drizzle-orm";

import { generateDailyBriefing } from "@syntheci/ai";
import {
  briefings,
  db,
  documents,
  meetingProposals,
  messages,
  sources,
  triageResults
} from "@syntheci/db";
import type { SourceType, TriageLabel } from "@syntheci/shared";

const BRIEFING_STOPWORDS = new Set([
  "about",
  "after",
  "also",
  "before",
  "being",
  "could",
  "from",
  "have",
  "help",
  "just",
  "more",
  "next",
  "that",
  "them",
  "they",
  "this",
  "want",
  "what",
  "when",
  "with",
  "your"
]);

function tokenizeBriefingText(text: string) {
  return (text.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter(
    (token) => token.length > 2 && !BRIEFING_STOPWORDS.has(token)
  );
}

function buildSourceRef(input: {
  sourceType: SourceType;
  sourceId: string;
  messageOrDocId: string;
}) {
  return {
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    messageOrDocId: input.messageOrDocId
  };
}

function sourceTypePreferenceValue(sourceType: SourceType, queryText: string) {
  if (/\b(security|sso|review|retention|regional|catalyst)\b/i.test(queryText)) {
    return sourceType === "upload" ? 3 : sourceType === "link" ? 2 : sourceType === "note" ? 1 : 0;
  }

  if (/\b(board|preview|investor|pipeline|wins)\b/i.test(queryText)) {
    return sourceType === "upload" ? 3 : sourceType === "link" ? 2 : sourceType === "note" ? 1 : 0;
  }

  if (/\b(partner|proposal|onboarding|activation)\b/i.test(queryText)) {
    return sourceType === "link" ? 3 : sourceType === "note" ? 2 : sourceType === "upload" ? 1 : 0;
  }

  return sourceType === "note" ? 3 : sourceType === "upload" ? 2 : sourceType === "link" ? 1 : 0;
}

function scoreSupportingDocument(input: {
  queryText: string;
  document: {
    sourceType: SourceType;
    title: string;
    rawText: string;
  };
}) {
  const queryTokens = new Set(tokenizeBriefingText(input.queryText));
  const titleTokens = tokenizeBriefingText(input.document.title);
  const bodyTokens = tokenizeBriefingText(input.document.rawText);

  let overlapScore = 0;
  for (const token of queryTokens) {
    if (titleTokens.includes(token)) {
      overlapScore += 2;
    }
    if (bodyTokens.includes(token)) {
      overlapScore += 1;
    }
  }

  return overlapScore + sourceTypePreferenceValue(input.document.sourceType, input.queryText) * 0.35;
}

export async function buildBriefingInput(input: {
  workspaceId: string;
  referenceTime?: Date;
}) {
  const now = input.referenceTime ?? new Date();
  const inThreeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const [openThreads, triageRows, supportingDocuments, upcomingMeetings] = await Promise.all([
    db.query.messages.findMany({
      where: and(eq(messages.workspaceId, input.workspaceId), eq(messages.isOpenThread, true)),
      orderBy: [desc(messages.receivedAt)],
      limit: 40
    }),
    db
      .select({
        messageId: triageResults.messageId,
        label: triageResults.label,
        confidence: triageResults.confidence,
        rationale: triageResults.rationale
      })
      .from(triageResults)
      .innerJoin(messages, eq(messages.id, triageResults.messageId))
      .where(
        and(
          eq(triageResults.workspaceId, input.workspaceId),
          eq(messages.isOpenThread, true),
          inArray(triageResults.label, ["urgent", "needs_reply", "follow_up"])
        )
      )
      .orderBy(desc(triageResults.updatedAt))
      .limit(80),
    db
      .select({
        id: documents.id,
        sourceId: documents.sourceId,
        sourceType: sources.type,
        title: documents.title,
        rawText: documents.rawText
      })
      .from(documents)
      .innerJoin(sources, eq(sources.id, documents.sourceId))
      .where(
        and(
          eq(documents.workspaceId, input.workspaceId),
          inArray(sources.type, ["note", "upload", "link"])
        )
      ),
    db.query.meetingProposals.findMany({
      where: and(
        eq(meetingProposals.workspaceId, input.workspaceId),
        gte(meetingProposals.startsAt, now)
      ),
      orderBy: [asc(meetingProposals.startsAt)],
      limit: 20
    })
  ]);

  const triageByMessageId = new Map(
    triageRows.map((row) => [
      row.messageId,
      {
        label: row.label as TriageLabel,
        confidence: row.confidence,
        rationale: row.rationale
      }
    ])
  );

  const openThreadInputs = openThreads.map((thread) => {
    const queryText = [thread.subject ?? "", thread.textBody].filter(Boolean).join("\n\n");
    const supportingSourceRefs = supportingDocuments
      .map((document) => ({
        sourceType: document.sourceType,
        sourceId: document.sourceId,
        messageOrDocId: document.id,
        title: document.title,
        score: scoreSupportingDocument({
          queryText,
          document: {
            sourceType: document.sourceType,
            title: document.title,
            rawText: document.rawText
          }
        })
      }))
      .filter((document) => document.score > 1)
      .sort((left, right) => right.score - left.score)
      .slice(0, 4)
      .map((document) =>
        buildSourceRef({
          sourceType: document.sourceType,
          sourceId: document.sourceId,
          messageOrDocId: document.messageOrDocId
        })
      );

    const triage = triageByMessageId.get(thread.id) ?? null;

    return {
      id: thread.id,
      subject: thread.subject,
      body: thread.textBody,
      sender: thread.senderEmail,
      receivedAt: thread.receivedAt,
      isUnread: thread.isUnread,
      triageLabel: triage?.label ?? null,
      triageConfidence: triage?.confidence ?? null,
      triageRationale: triage?.rationale ?? null,
      primarySourceRef: buildSourceRef({
        sourceType: "gmail",
        sourceId: thread.sourceId,
        messageOrDocId: thread.id
      }),
      supportingSourceRefs
    };
  });

  const filteredMeetings = upcomingMeetings.filter(
    (meeting) => meeting.startsAt && meeting.startsAt <= inThreeDays
  );

  const meetingInputs = filteredMeetings.map((meeting) => {
    const sourceMessage = openThreads.find((thread) => thread.id === meeting.sourceMessageId) ?? null;

    return {
      id: meeting.id,
      title: meeting.title,
      startsAt: meeting.startsAt,
      attendees: meeting.attendees,
      status: meeting.status,
      sourceMessageRef:
        sourceMessage && meeting.sourceMessageId
          ? buildSourceRef({
              sourceType: "gmail",
              sourceId: sourceMessage.sourceId,
              messageOrDocId: meeting.sourceMessageId
            })
          : null
    };
  });

  return {
    openThreads: openThreadInputs,
    urgentItems: openThreadInputs.filter((thread) => thread.triageLabel === "urgent"),
    followUps: openThreadInputs.filter((thread) =>
      thread.triageLabel === "needs_reply" || thread.triageLabel === "follow_up"
    ),
    upcomingMeetings: meetingInputs
  };
}

export async function buildAndStoreBriefing(input: {
  workspaceId: string;
  briefingDate: string;
  referenceTime?: Date;
}) {
  const briefingInput = await buildBriefingInput({
    workspaceId: input.workspaceId,
    referenceTime: input.referenceTime
  });

  const generated = await generateDailyBriefing(briefingInput);

  const [saved] = await db
    .insert(briefings)
    .values({
      workspaceId: input.workspaceId,
      briefingDate: input.briefingDate,
      summary: generated.summary,
      items: generated.items,
      generatedAt: new Date()
    })
    .onConflictDoUpdate({
      target: [briefings.workspaceId, briefings.briefingDate],
      set: {
        summary: generated.summary,
        items: generated.items,
        generatedAt: new Date()
      }
    })
    .returning();

  return saved;
}

export async function getWorkspacesNeedingBriefingToday() {
  const rows = await db.execute(sql`
    select distinct workspace_id
    from memberships
  `);

  return rows.rows.map((row) => String(row.workspace_id));
}
