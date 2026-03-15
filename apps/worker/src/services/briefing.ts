import { and, asc, desc, eq, gte, inArray, sql } from "drizzle-orm";

import { generateDailyBriefing } from "@syntheci/ai";
import { briefings, db, meetingProposals, messages, triageResults } from "@syntheci/db";

export async function buildBriefingInput(input: {
  workspaceId: string;
  referenceTime?: Date;
}) {
  const now = input.referenceTime ?? new Date();
  const inThreeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const [openThreads, urgentItems, followUps, upcomingMeetings] = await Promise.all([
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
      .where(
        and(eq(triageResults.workspaceId, input.workspaceId), eq(triageResults.label, "urgent"))
      )
      .orderBy(desc(triageResults.updatedAt))
      .limit(20),
    db
      .select({
        messageId: triageResults.messageId,
        label: triageResults.label,
        confidence: triageResults.confidence,
        rationale: triageResults.rationale
      })
      .from(triageResults)
      .where(
        and(
          eq(triageResults.workspaceId, input.workspaceId),
          inArray(triageResults.label, ["needs_reply", "follow_up"])
        )
      )
      .orderBy(desc(triageResults.updatedAt))
      .limit(20),
    db.query.meetingProposals.findMany({
      where: and(
        eq(meetingProposals.workspaceId, input.workspaceId),
        gte(meetingProposals.startsAt, now)
      ),
      orderBy: [asc(meetingProposals.startsAt)],
      limit: 20
    })
  ]);

  const filteredMeetings = upcomingMeetings.filter(
    (meeting) => meeting.startsAt && meeting.startsAt <= inThreeDays
  );

  return {
    openThreads: openThreads.map((thread) => ({
      id: thread.id,
      subject: thread.subject,
      sender: thread.senderEmail,
      receivedAt: thread.receivedAt,
      isUnread: thread.isUnread
    })),
    urgentItems,
    followUps,
    upcomingMeetings: filteredMeetings.map((meeting) => ({
      id: meeting.id,
      title: meeting.title,
      startsAt: meeting.startsAt,
      attendees: meeting.attendees
    }))
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
