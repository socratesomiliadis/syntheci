import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import {
  connectedAccounts,
  db,
  meetingProposals,
  messages,
  sources
} from "@syntheci/db";

import { decryptSecret } from "@/lib/crypto";
import { isDemoConnectedAccount } from "@/lib/demo";
import { createCalendarEvent } from "@/lib/google";
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
  if (proposal.status !== "approved") {
    return NextResponse.json({ error: "proposal must be approved first" }, { status: 400 });
  }
  if (!proposal.startsAt || !proposal.endsAt) {
    return NextResponse.json({ error: "proposal missing start/end time" }, { status: 400 });
  }

  const sourceMessage = await db.query.messages.findFirst({
    where: and(
      eq(messages.id, proposal.sourceMessageId),
      eq(messages.workspaceId, workspaceId)
    )
  });
  if (!sourceMessage) {
    return NextResponse.json({ error: "source message not found" }, { status: 404 });
  }

  const source = await db.query.sources.findFirst({
    where: and(eq(sources.id, sourceMessage.sourceId), eq(sources.workspaceId, workspaceId))
  });
  if (!source?.connectedAccountId) {
    return NextResponse.json({ error: "source not connected to oauth account" }, { status: 400 });
  }

  const account = await db.query.connectedAccounts.findFirst({
    where: and(
      eq(connectedAccounts.id, source.connectedAccountId),
      eq(connectedAccounts.provider, "google"),
      eq(connectedAccounts.workspaceId, workspaceId)
    )
  });
  if (!account) {
    return NextResponse.json({ error: "google connector not found" }, { status: 404 });
  }

  if (isDemoConnectedAccount(account)) {
    const [updated] = await db
      .update(meetingProposals)
      .set({
        status: "created",
        externalEventId: `demo-created-${proposal.id}`,
        updatedAt: new Date()
      })
      .where(eq(meetingProposals.id, proposal.id))
      .returning({
        id: meetingProposals.id,
        status: meetingProposals.status,
        externalEventId: meetingProposals.externalEventId
      });

    return NextResponse.json(updated);
  }

  const accessToken = decryptSecret(account.accessTokenCiphertext);
  const refreshToken = account.refreshTokenCiphertext
    ? decryptSecret(account.refreshTokenCiphertext)
    : null;

  const event = await createCalendarEvent({
    accessToken,
    refreshToken,
    summary: proposal.title,
    description: proposal.description,
    start: proposal.startsAt.toISOString(),
    end: proposal.endsAt.toISOString(),
    attendees: (proposal.attendees as string[]) ?? [],
    timezone: proposal.timezone
  });

  const [updated] = await db
    .update(meetingProposals)
    .set({
      status: "created",
      externalEventId: event.id ?? null,
      updatedAt: new Date()
    })
    .where(eq(meetingProposals.id, proposal.id))
    .returning({
      id: meetingProposals.id,
      status: meetingProposals.status,
      externalEventId: meetingProposals.externalEventId
    });

  return NextResponse.json(updated);
}
