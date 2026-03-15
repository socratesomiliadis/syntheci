import Link from "next/link";

import { and, desc, eq, sql } from "drizzle-orm";
import { ArrowRight, BookUser, CalendarRange, FileText, Inbox } from "lucide-react";

import { briefings, db, draftReplies, meetingProposals } from "@syntheci/db";
import type { BriefingItem } from "@syntheci/shared";

import { BriefingPanel } from "@/components/dashboard/briefing-panel";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getContactCount } from "@/lib/contacts";
import { getConnectorStatus, getOpenThreadCount, getPriorityInbox } from "@/lib/dashboard";
import { requireWorkspaceContext } from "@/lib/session";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardOverviewPage() {
  const { workspaceId } = await requireWorkspaceContext();

  const [
    connectors,
    inbox,
    openThreadCount,
    latestBriefing,
    pendingDraftCount,
    pendingMeetingCount,
    contactCount
  ] = await Promise.all([
    getConnectorStatus(workspaceId),
    getPriorityInbox(workspaceId),
    getOpenThreadCount(workspaceId),
    db.query.briefings.findFirst({
      where: eq(briefings.workspaceId, workspaceId),
      orderBy: [desc(briefings.briefingDate)]
    }),
    db
      .select({
        count: sql<number>`count(*)::int`
      })
      .from(draftReplies)
      .where(and(eq(draftReplies.workspaceId, workspaceId), eq(draftReplies.status, "generated"))),
    db
      .select({
        count: sql<number>`count(*)::int`
      })
      .from(meetingProposals)
      .where(and(eq(meetingProposals.workspaceId, workspaceId), eq(meetingProposals.status, "proposed"))),
    getContactCount(workspaceId)
  ]);

  const briefingCount = latestBriefing ? ((latestBriefing.items as BriefingItem[]) ?? []).length : 0;
  const pendingDrafts = Number(pendingDraftCount[0]?.count ?? 0);
  const pendingMeetings = Number(pendingMeetingCount[0]?.count ?? 0);
  const topInboxItems = inbox.slice(0, 4);
  const operationalSummary = [
    `${connectors.length} provider${connectors.length === 1 ? "" : "s"} connected`,
    `${briefingCount} briefing item${briefingCount === 1 ? "" : "s"}`,
    `${contactCount} contact${contactCount === 1 ? "" : "s"}`
  ].join(" | ");

  return (
    <main className="space-y-4 px-4 py-5 md:px-6 md:py-6">
      <section className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div className="grid flex-1 gap-3 md:grid-cols-3">
          <Card className="rounded-[1.5rem] border-warning/25 bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-foreground">Open priority threads</CardTitle>
              <CardDescription>Threads that still need attention.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-semibold tracking-tight text-foreground">{openThreadCount}</p>
              <Link
                href="/dashboard/inbox"
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-foreground"
              >
                Go to inbox
                <ArrowRight className="size-4" />
              </Link>
            </CardContent>
          </Card>

          <Card className="rounded-[1.5rem] border-info/25 bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-foreground">Pending draft approvals</CardTitle>
              <CardDescription>Generated replies waiting on a human decision.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-semibold tracking-tight text-foreground">{pendingDrafts}</p>
              <Link
                href="/dashboard/drafts"
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-foreground"
              >
                Review drafts
                <ArrowRight className="size-4" />
              </Link>
            </CardContent>
          </Card>

          <Card className="rounded-[1.5rem] border-success/25 bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-foreground">Meeting proposals waiting</CardTitle>
              <CardDescription>Scheduling intents needing review before creation.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-semibold tracking-tight text-foreground">{pendingMeetings}</p>
              <Link
                href="/dashboard/meetings"
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-foreground"
              >
                Review meetings
                <ArrowRight className="size-4" />
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap gap-3 xl:justify-end">
          <Link href="/dashboard/inbox" className={cn(buttonVariants({ variant: "default" }), "rounded-xl")}>
            Open inbox
          </Link>
          <Link href="/dashboard/chat" className={cn(buttonVariants({ variant: "outline" }), "rounded-xl")}>
            Open knowledge chat
          </Link>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-6">
          <Card className="rounded-[1.6rem] border-border/80 bg-card/90 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-lg">Action queue</CardTitle>
                  <CardDescription>The highest-signal items across triage and approvals.</CardDescription>
                </div>
                <Link
                  href="/dashboard/inbox"
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-xl")}
                >
                  See all work
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {topInboxItems.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border bg-muted px-4 py-5 text-sm text-muted-foreground">
                  No urgent threads yet.
                </p>
              ) : (
                topInboxItems.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-[1.1rem] border border-border/80 bg-muted/70 px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">{item.subject ?? "(no subject)"}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {item.senderName ?? item.senderEmail ?? "Unknown sender"}
                        </p>
                      </div>
                      <Link
                        href="/dashboard/inbox"
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-xl")}
                      >
                        Open
                      </Link>
                    </div>
                    <p className="mt-3 text-xs uppercase tracking-[0.24em] text-muted-foreground">
                      Score {item.score.toFixed(1)}
                    </p>
                  </article>
                ))
              )}
            </CardContent>
          </Card>

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

        <div className="space-y-6">
          <Card className="rounded-[1.6rem] border-border/80 bg-card/90 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Workflow focus</CardTitle>
              <CardDescription>Jump straight into the next working area.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link
                href="/dashboard/inbox"
                className="flex items-center justify-between rounded-[1.05rem] border border-border/80 bg-muted/70 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent/80"
              >
                <span className="inline-flex items-center gap-2">
                  <Inbox className="size-4 text-amber-700" />
                  Priority Inbox
                </span>
                <span>{openThreadCount}</span>
              </Link>
              <Link
                href="/dashboard/drafts"
                className="flex items-center justify-between rounded-[1.05rem] border border-border/80 bg-muted/70 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent/80"
              >
                <span className="inline-flex items-center gap-2">
                  <FileText className="size-4 text-blue-700" />
                  Draft Center
                </span>
                <span>{pendingDrafts}</span>
              </Link>
              <Link
                href="/dashboard/meetings"
                className="flex items-center justify-between rounded-[1.05rem] border border-border/80 bg-muted/70 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent/80"
              >
                <span className="inline-flex items-center gap-2">
                  <CalendarRange className="size-4 text-emerald-700" />
                  Meeting Center
                </span>
                <span>{pendingMeetings}</span>
              </Link>
              <Link
                href="/dashboard/contacts"
                className="flex items-center justify-between rounded-[1.05rem] border border-border/80 bg-muted/70 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent/80"
              >
                <span className="inline-flex items-center gap-2">
                  <BookUser className="size-4 text-sky-700" />
                  Contact Book
                </span>
                <span>{contactCount}</span>
              </Link>

              <div className="rounded-[1.05rem] border border-border/80 bg-muted/60 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Operational baseline</p>
                <p className="mt-2 text-sm text-foreground">{operationalSummary}</p>
              </div>

              <div className="flex gap-3">
                <Link
                  href="/dashboard/connectors"
                  className={cn(buttonVariants({ variant: "outline" }), "flex-1 rounded-xl")}
                >
                  Manage connectors
                </Link>
                <Link
                  href="/dashboard/contacts"
                  className={cn(buttonVariants({ variant: "outline" }), "flex-1 rounded-xl")}
                >
                  Open contacts
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
