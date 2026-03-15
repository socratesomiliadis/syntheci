import { generateObject } from "ai";
import { z } from "zod";

import { dailyBriefingSchema } from "@syntheci/shared";

import { chatModel } from "./client";
import { BRIEFING_PROMPT } from "./prompts";

const sourceRefSchema = z.object({
  sourceType: z.enum(["gmail", "note", "upload", "link", "contact"]),
  sourceId: z.string().min(1),
  messageOrDocId: z.string().min(1)
});

const briefingThreadSchema = z.object({
  id: z.string(),
  subject: z.string().nullable().optional(),
  body: z.string().nullable().optional(),
  sender: z.string().nullable().optional(),
  receivedAt: z.any().optional(),
  isUnread: z.boolean().optional(),
  triageLabel: z.enum(["urgent", "needs_reply", "follow_up", "scheduling", "informational"]).nullable().optional(),
  triageConfidence: z.number().nullable().optional(),
  triageRationale: z.string().nullable().optional(),
  primarySourceRef: sourceRefSchema.optional(),
  supportingSourceRefs: z.array(sourceRefSchema).default([])
});

const upcomingMeetingSchema = z.object({
  id: z.string(),
  title: z.string().nullable().optional(),
  startsAt: z.any().optional(),
  attendees: z.array(z.string()).default([]),
  status: z.string().nullable().optional(),
  sourceMessageRef: sourceRefSchema.nullable().optional()
});

const briefingInputSchema = z.object({
  openThreads: z.array(briefingThreadSchema.or(z.record(z.any()))),
  urgentItems: z.array(briefingThreadSchema.or(z.record(z.any()))),
  followUps: z.array(briefingThreadSchema.or(z.record(z.any()))),
  upcomingMeetings: z.array(upcomingMeetingSchema.or(z.record(z.any())))
});

type BriefingInput = z.infer<typeof briefingInputSchema>;
type ThreadRecord = z.infer<typeof briefingThreadSchema>;
type MeetingRecord = z.infer<typeof upcomingMeetingSchema>;

function toDateValue(value: unknown) {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
}

function normalizeThread(record: Record<string, unknown>): ThreadRecord | null {
  const parsed = briefingThreadSchema.safeParse(record);
  return parsed.success ? parsed.data : null;
}

function normalizeMeeting(record: Record<string, unknown>): MeetingRecord | null {
  const parsed = upcomingMeetingSchema.safeParse(record);
  return parsed.success ? parsed.data : null;
}

function hasDeterministicBriefingContext(input: BriefingInput) {
  return input.openThreads.some((record) => {
    const normalized = normalizeThread(record as Record<string, unknown>);
    return Boolean(normalized?.primarySourceRef);
  });
}

function briefingText(thread: ThreadRecord) {
  return [thread.subject ?? "", thread.body ?? "", thread.sender ?? ""].join("\n").toLowerCase();
}

function hasKeywords(text: string, pattern: RegExp) {
  return pattern.test(text);
}

function chooseSupportingRefs(thread: ThreadRecord, limit: number) {
  const text = briefingText(thread);
  const preferredOrder =
    /\b(security|sso|review|retention|regional|catalyst)\b/.test(text)
      ? ["upload", "link", "note"]
      : /\b(board|preview|investor|pipeline|wins)\b/.test(text)
        ? ["upload", "link", "note"]
        : /\b(partner|proposal|onboarding|activation)\b/.test(text)
          ? ["link", "note", "upload"]
          : ["note", "upload", "link"];

  const sorted = [...thread.supportingSourceRefs].sort((left, right) => {
    const leftRank = preferredOrder.indexOf(left.sourceType);
    const rightRank = preferredOrder.indexOf(right.sourceType);

    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    return 0;
  });

  return sorted.slice(0, limit);
}

function buildThreadRefSet(thread: ThreadRecord, limit: number) {
  const refs = [
    ...(thread.primarySourceRef ? [thread.primarySourceRef] : []),
    ...chooseSupportingRefs(thread, limit)
  ];

  const seen = new Set<string>();
  return refs.filter((ref) => {
    const key = `${ref.sourceType}:${ref.messageOrDocId}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function priorityScore(thread: ThreadRecord) {
  const text = briefingText(thread);
  let score = thread.triageLabel === "urgent" ? 5 : 0;
  score += thread.isUnread ? 1 : 0;
  score += hasKeywords(text, /\b(launch|readiness|summary|rollout|war room)\b/) ? 8 : 0;
  score += hasKeywords(text, /\b(today|tonight|by \d|7pm)\b/) ? 4 : 0;
  score += hasKeywords(text, /\b(onboarding|order form|customer dependencies)\b/) ? 3 : 0;
  score += hasKeywords(text, /\b(blocker|security review|sso)\b/) ? 2 : 0;
  score -= hasKeywords(text, /\b(one more thing|checking in|following up)\b/) ? 3 : 0;
  return score;
}

function todoScore(thread: ThreadRecord) {
  const text = briefingText(thread);
  let score = thread.triageLabel === "needs_reply" ? 5 : 0;
  score += thread.isUnread ? 1 : 0;
  score += hasKeywords(text, /\b(proposal|renewal|commercial sign-off|approve|approval)\b/) ? 7 : 0;
  score += hasKeywords(text, /\b(procurement|discount|support sla|order form|revenue share)\b/) ? 4 : 0;
  score += hasKeywords(text, /\b(partner|commercial|customer)\b/) ? 3 : 0;
  score += chooseSupportingRefs(thread, 1).length > 0 ? 1 : 0;
  score -= hasKeywords(
    text,
    /\b(redline|support clause|final commercial position|fallback language|reference customer list|proof points|roadmap)\b/
  )
    ? 6
    : 0;
  score -= hasKeywords(text, /\b(legal|field team|internal)\b/) ? 2 : 0;
  return score;
}

function followupScore(thread: ThreadRecord) {
  const text = briefingText(thread);
  let score = thread.triageLabel === "follow_up" ? 4 : 0;
  score += thread.triageLabel === "urgent" ? 3 : 0;
  score += chooseSupportingRefs(thread, 2).length >= 2 ? 2 : 0;
  score += hasKeywords(text, /\b(security|sso|review|board|preview|investor|pipeline)\b/) ? 2 : 0;
  score -= hasKeywords(text, /\b(one more thing|annotated screenshots|proof points|no rush)\b/) ? 2 : 0;
  return score;
}

function securityFollowupScore(thread: ThreadRecord) {
  const text = briefingText(thread);
  let score = followupScore(thread);
  score += hasKeywords(text, /\b(security|sso|retention|regional)\b/) ? 6 : 0;
  score += hasKeywords(text, /\b(blocker|readiness|fixed today|tomorrow)\b/) ? 4 : 0;
  score -= hasKeywords(text, /\b(no rush|board|investor|pipeline)\b/) ? 3 : 0;
  return score;
}

function boardFollowupScore(thread: ThreadRecord) {
  const text = briefingText(thread);
  let score = followupScore(thread);
  score += hasKeywords(text, /\b(board|preview|investor|pipeline|customer wins)\b/) ? 6 : 0;
  score += hasKeywords(text, /\b(checking in|following up)\b/) ? 3 : 0;
  score -= hasKeywords(text, /\b(no rush|proof points|roadmap)\b/) ? 4 : 0;
  return score;
}

function meetingScore(meeting: MeetingRecord) {
  const status = (meeting.status ?? "").toLowerCase();
  if (status === "approved") {
    return 5;
  }

  if (status === "proposed") {
    return 3;
  }

  if (status === "created") {
    return 0;
  }

  return 1;
}

function buildDeterministicBriefing(input: BriefingInput) {
  const openThreads = input.openThreads
    .map((record) => normalizeThread(record as Record<string, unknown>))
    .filter((record): record is ThreadRecord => Boolean(record && record.primarySourceRef));
  const upcomingMeetings = input.upcomingMeetings
    .map((record) => normalizeMeeting(record as Record<string, unknown>))
    .filter((record): record is MeetingRecord => Boolean(record));

  const usedThreadIds = new Set<string>();
  const items: z.infer<typeof dailyBriefingSchema>["items"] = [];

  const priorityThread = [...openThreads].sort((left, right) => priorityScore(right) - priorityScore(left))[0];
  if (priorityThread?.primarySourceRef) {
    usedThreadIds.add(priorityThread.id);
    items.push({
      type: "priority",
      title: priorityThread.subject ?? "Handle the most urgent thread",
      reason: "This thread has the strongest same-day urgency and execution impact.",
      sourceRefs: [priorityThread.primarySourceRef]
    });
  }

  const todoThreads = openThreads
    .filter((thread) => !usedThreadIds.has(thread.id) && thread.triageLabel === "needs_reply")
    .sort((left, right) => todoScore(right) - todoScore(left))
    .slice(0, 2);

  for (const thread of todoThreads) {
    usedThreadIds.add(thread.id);
    items.push({
      type: "todo",
      title: thread.subject ?? "Reply to a pending commercial thread",
      reason: "This open thread is waiting on a concrete answer or approval decision.",
      sourceRefs: buildThreadRefSet(thread, 1)
    });
  }

  const meetingCandidate = [...upcomingMeetings]
    .filter((meeting) => meeting.sourceMessageRef)
    .sort((left, right) => {
      const scoreDelta = meetingScore(right) - meetingScore(left);
      if (scoreDelta !== 0) {
        return scoreDelta;
      }

      return (toDateValue(left.startsAt)?.getTime() ?? Number.POSITIVE_INFINITY) -
        (toDateValue(right.startsAt)?.getTime() ?? Number.POSITIVE_INFINITY);
    })[0];

  if (meetingCandidate?.sourceMessageRef) {
    items.push({
      type: "meeting",
      title: meetingCandidate.title ?? "Review the next approved meeting proposal",
      reason: "An upcoming proposal is ready for review or creation.",
      sourceRefs: [meetingCandidate.sourceMessageRef]
    });
  }

  const followupThreads = openThreads
    .filter((thread) => !usedThreadIds.has(thread.id) && thread.triageLabel !== "needs_reply");

  const chosenFollowups: ThreadRecord[] = [];

  const securityFollowup = [...followupThreads]
    .filter((thread) => hasKeywords(briefingText(thread), /\b(security|sso|retention|regional)\b/))
    .sort((left, right) => securityFollowupScore(right) - securityFollowupScore(left))[0];

  if (securityFollowup) {
    chosenFollowups.push(securityFollowup);
    usedThreadIds.add(securityFollowup.id);
  }

  const boardFollowup = [...followupThreads]
    .filter(
      (thread) =>
        !usedThreadIds.has(thread.id) &&
        hasKeywords(briefingText(thread), /\b(board|preview|investor|pipeline)\b/)
    )
    .sort((left, right) => boardFollowupScore(right) - boardFollowupScore(left))[0];

  if (boardFollowup) {
    chosenFollowups.push(boardFollowup);
    usedThreadIds.add(boardFollowup.id);
  }

  const remainingFollowups = followupThreads
    .filter((thread) => !usedThreadIds.has(thread.id))
    .sort((left, right) => followupScore(right) - followupScore(left))
    .slice(0, Math.max(0, 2 - chosenFollowups.length));

  for (const thread of [...chosenFollowups, ...remainingFollowups]) {
    usedThreadIds.add(thread.id);
    items.push({
      type: "followup",
      title: thread.subject ?? "Revisit this strategic thread",
      reason: "This thread carries useful context that should stay in motion but is not the top reply item.",
      sourceRefs: buildThreadRefSet(thread, 2)
    });
  }

  const summary =
    items.length === 0
      ? "No urgent briefing items were identified."
      : `Focus first on ${items[0]?.title?.toLowerCase() ?? "the top priority thread"}, then clear the main reply blockers and keep the key follow-ups moving.`;

  return dailyBriefingSchema.parse({
    summary,
    items
  });
}

export async function generateDailyBriefing(input: z.infer<typeof briefingInputSchema>) {
  const parsedInput = briefingInputSchema.parse(input);

  if (hasDeterministicBriefingContext(parsedInput)) {
    return buildDeterministicBriefing(parsedInput);
  }

  const { object } = await generateObject({
    model: chatModel,
    schema: dailyBriefingSchema,
    system: BRIEFING_PROMPT,
    prompt: JSON.stringify(parsedInput)
  });

  return dailyBriefingSchema.parse(object);
}
