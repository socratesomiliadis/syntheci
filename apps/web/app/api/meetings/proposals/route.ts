import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { extractMeetingProposal } from "@syntheci/ai";
import { db, meetingProposals, messages } from "@syntheci/db";

import { requireWorkspaceContext } from "@/lib/session";

const requestSchema = z.object({
  messageId: z.string().uuid()
});

export async function POST(request: Request) {
  const { workspaceId } = await requireWorkspaceContext();
  const body = requestSchema.parse(await request.json());

  const message = await db.query.messages.findFirst({
    where: and(eq(messages.id, body.messageId), eq(messages.workspaceId, workspaceId))
  });
  if (!message) {
    return NextResponse.json({ error: "message not found" }, { status: 404 });
  }

  const extracted = await extractMeetingProposal({
    subject: message.subject,
    body: message.textBody,
    sender: message.senderEmail,
    timezone: "Europe/Athens"
  });

  if (!extracted.hasSchedulingIntent || !extracted.title) {
    return NextResponse.json({
      hasSchedulingIntent: false
    });
  }

  const [proposal] = await db
    .insert(meetingProposals)
    .values({
      workspaceId,
      sourceMessageId: message.id,
      title: extracted.title,
      description: extracted.rationale,
      timezone: "Europe/Athens",
      startsAt: extracted.startsAt ? new Date(extracted.startsAt) : null,
      endsAt: extracted.endsAt ? new Date(extracted.endsAt) : null,
      attendees: extracted.attendees,
      status: "proposed"
    })
    .returning({
      id: meetingProposals.id,
      status: meetingProposals.status
    });

  return NextResponse.json({
    hasSchedulingIntent: true,
    ...proposal
  });
}
