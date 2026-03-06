import { desc, eq } from "drizzle-orm";

import { briefings, db, draftReplies, meetingProposals } from "@syntheci/db";
import type { BriefingItem } from "@syntheci/shared";

import { BriefingPanel } from "@/components/dashboard/briefing-panel";
import { ChatPanel } from "@/components/dashboard/chat-panel";
import { ConnectorsPanel } from "@/components/dashboard/connectors-panel";
import { DraftCenter } from "@/components/dashboard/draft-center";
import { IngestPanel } from "@/components/dashboard/ingest-panel";
import { MeetingCenter } from "@/components/dashboard/meeting-center";
import { PriorityInbox } from "@/components/dashboard/priority-inbox";
import { SignOutButton } from "@/components/dashboard/sign-out-button";
import { getConnectorStatus, getOpenThreadCount, getPriorityInbox } from "@/lib/dashboard";
import { requireWorkspaceContext } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { session, workspaceId } = await requireWorkspaceContext();

  const [connectors, inbox, openThreadCount, latestBriefing, drafts, proposals] = await Promise.all([
    getConnectorStatus(workspaceId),
    getPriorityInbox(workspaceId),
    getOpenThreadCount(workspaceId),
    db.query.briefings.findFirst({
      where: eq(briefings.workspaceId, workspaceId),
      orderBy: [desc(briefings.briefingDate)]
    }),
    db.query.draftReplies.findMany({
      where: eq(draftReplies.workspaceId, workspaceId),
      orderBy: [desc(draftReplies.createdAt)],
      limit: 10
    }),
    db.query.meetingProposals.findMany({
      where: eq(meetingProposals.workspaceId, workspaceId),
      orderBy: [desc(meetingProposals.createdAt)],
      limit: 10
    })
  ]);

  return (
    <main className="app-shell grid" style={{ gap: "1.2rem" }}>
      <section className="panel row">
        <div>
          <h1 style={{ margin: 0 }}>Syntheci Dashboard</h1>
          <p className="muted" style={{ marginBottom: 0 }}>
            {session.user.email} • open threads: {openThreadCount}
          </p>
        </div>
        <SignOutButton />
      </section>

      <div className="grid-2">
        <ConnectorsPanel connectors={connectors} />
        <BriefingPanel
          briefing={
            latestBriefing
              ? {
                  briefingDate: latestBriefing.briefingDate,
                  summary: latestBriefing.summary,
                  items: latestBriefing.items as BriefingItem[]
                }
              : null
          }
        />
      </div>

      <ChatPanel />
      <IngestPanel />
      <PriorityInbox initialItems={inbox} />
      <div className="grid-2">
        <DraftCenter initialDrafts={drafts} />
        <MeetingCenter
          initialProposals={proposals.map((proposal) => ({
            id: proposal.id,
            title: proposal.title,
            startsAt: proposal.startsAt ? proposal.startsAt.toISOString() : null,
            endsAt: proposal.endsAt ? proposal.endsAt.toISOString() : null,
            timezone: proposal.timezone,
            attendees: (proposal.attendees as string[]) ?? [],
            status: proposal.status
          }))}
        />
      </div>
    </main>
  );
}
