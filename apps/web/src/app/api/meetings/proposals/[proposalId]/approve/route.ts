import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { db, meetingProposals } from "@syntheci/db";

import { requireWorkspaceContext } from "@/lib/session";

export async function POST(
  _request: NextRequest,
  context: {
    params: Promise<{
      proposalId: string;
    }>;
  }
) {
  const { workspaceId } = await requireWorkspaceContext();
  const { proposalId } = await context.params;

  const proposal = await db.query.meetingProposals.findFirst({
    where: and(
      eq(meetingProposals.id, proposalId),
      eq(meetingProposals.workspaceId, workspaceId)
    )
  });
  if (!proposal) {
    return NextResponse.json({ error: "proposal not found" }, { status: 404 });
  }
  if (proposal.status !== "proposed") {
    return NextResponse.json({ error: "proposal must be in proposed state" }, { status: 400 });
  }

  const [updated] = await db
    .update(meetingProposals)
    .set({
      status: "approved",
      updatedAt: new Date()
    })
    .where(eq(meetingProposals.id, proposal.id))
    .returning({
      id: meetingProposals.id,
      status: meetingProposals.status
    });

  return NextResponse.json(updated);
}
