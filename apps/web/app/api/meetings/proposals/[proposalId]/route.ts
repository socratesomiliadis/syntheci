import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { db, meetingProposals } from "@syntheci/db";

import { requireWorkspaceContext } from "@/lib/session";

const requestSchema = z
  .object({
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime()
  })
  .superRefine((value, ctx) => {
    if (new Date(value.endsAt) <= new Date(value.startsAt)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "end time must be after start time",
        path: ["endsAt"]
      });
    }
  });

export async function PATCH(
  request: NextRequest,
  context: {
    params: Promise<{
      proposalId: string;
    }>;
  }
) {
  const { workspaceId } = await requireWorkspaceContext();
  const { proposalId } = await context.params;
  const body = requestSchema.parse(await request.json());

  const proposal = await db.query.meetingProposals.findFirst({
    where: and(
      eq(meetingProposals.id, proposalId),
      eq(meetingProposals.workspaceId, workspaceId)
    )
  });

  if (!proposal) {
    return NextResponse.json({ error: "proposal not found" }, { status: 404 });
  }

  if (proposal.status === "created") {
    return NextResponse.json(
      { error: "cannot edit timing after calendar event creation" },
      { status: 400 }
    );
  }

  const [updated] = await db
    .update(meetingProposals)
    .set({
      startsAt: new Date(body.startsAt),
      endsAt: new Date(body.endsAt),
      updatedAt: new Date()
    })
    .where(eq(meetingProposals.id, proposal.id))
    .returning({
      id: meetingProposals.id,
      status: meetingProposals.status,
      startsAt: meetingProposals.startsAt,
      endsAt: meetingProposals.endsAt
    });

  return NextResponse.json({
    id: updated.id,
    status: updated.status,
    startsAt: updated.startsAt?.toISOString() ?? null,
    endsAt: updated.endsAt?.toISOString() ?? null
  });
}
