import Link from "next/link";

import { and, desc, eq, sql } from "drizzle-orm";
import { ArrowRight, CalendarRange, FileText, Inbox, Sparkles } from "lucide-react";

import { briefings, db, draftReplies, meetingProposals } from "@syntheci/db";
import type { BriefingItem } from "@syntheci/shared";

import { BriefingPanel } from "@/components/dashboard/briefing-panel";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getConnectorStatus, getOpenThreadCount, getPriorityInbox } from "@/lib/dashboard";
import { requireWorkspaceContext } from "@/lib/session";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardOverviewPage() {
  const { workspaceId } = await requireWorkspaceContext();

  const [connectors, inbox, openThreadCount, latestBriefing, pendingDraftCount, pendingMeetingCount] =
    await Promise.all([
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
        .where(and(eq(meetingProposals.workspaceId, workspaceId), eq(meetingProposals.status, "proposed")))
    ]);

  const briefingCount = latestBriefing ? ((latestBriefing.items as BriefingItem[]) ?? []).length : 0;
  const pendingDrafts = Number(pendingDraftCount[0]?.count ?? 0);
  const pendingMeetings = Number(pendingMeetingCount[0]?.count ?? 0);
  const topInboxItems = inbox.slice(0, 4);

  return (
    <main className="space-y-6 px-4 py-5 md:px-6 md:py-6">
      <section className="overflow-hidden rounded-[1.8rem] border border-slate-200/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.95),rgba(255,248,237,0.94))] p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <Badge className="border border-amber-200 bg-amber-50 text-amber-800">
              <Sparkles className="mr-1 size-3.5" />
              Urgent work first
            </Badge>
            <div className="space-y-3">
              <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
                Start with what needs action now, then drop into the exact workflow page.
              </h2>
              <p className="max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
                Today&apos;s cockpit keeps triage, approvals, and meeting follow-ups above the fold,
                while connectors and ingestion stay visible as supporting operations.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard/inbox" className={cn(buttonVariants({ variant: "default" }), "rounded-xl")}>
              Open inbox
            </Link>
            <Link
              href="/dashboard/chat"
              className={cn(buttonVariants({ variant: "outline" }), "rounded-xl border-slate-300 bg-white/80")}
            >
              Open knowledge chat
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-[1.5rem] border-amber-200/80 bg-[linear-gradient(180deg,rgba(255,251,235,0.96),rgba(255,255,255,0.96))] shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-700">Open priority threads</CardTitle>
            <CardDescription>Threads that still need attention.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-semibold tracking-tight text-slate-950">{openThreadCount}</p>
            <Link href="/dashboard/inbox" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-slate-700">
              Go to inbox
              <ArrowRight className="size-4" />
            </Link>
          </CardContent>
        </Card>

        <Card className="rounded-[1.5rem] border-blue-200/80 bg-[linear-gradient(180deg,rgba(239,246,255,0.96),rgba(255,255,255,0.96))] shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-700">Pending draft approvals</CardTitle>
            <CardDescription>Generated replies waiting on a human decision.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-semibold tracking-tight text-slate-950">{pendingDrafts}</p>
            <Link href="/dashboard/drafts" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-slate-700">
              Review drafts
              <ArrowRight className="size-4" />
            </Link>
          </CardContent>
        </Card>

        <Card className="rounded-[1.5rem] border-emerald-200/80 bg-[linear-gradient(180deg,rgba(236,253,245,0.96),rgba(255,255,255,0.96))] shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-700">Meeting proposals waiting</CardTitle>
            <CardDescription>Scheduling intents needing review before creation.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-semibold tracking-tight text-slate-950">{pendingMeetings}</p>
            <Link href="/dashboard/meetings" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-slate-700">
              Review meetings
              <ArrowRight className="size-4" />
            </Link>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-6">
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

          <Card className="rounded-[1.6rem] border-slate-200/80 bg-white/90 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-lg">Action queue</CardTitle>
                  <CardDescription>
                    The highest-signal items across triage and approvals.
                  </CardDescription>
                </div>
                <Link href="/dashboard/inbox" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-xl")}>
                  See all work
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {topInboxItems.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                  No urgent threads yet.
                </p>
              ) : (
                topInboxItems.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-[1.1rem] border border-slate-200/80 bg-slate-50/70 px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">{item.subject ?? "(no subject)"}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.senderName ?? item.senderEmail ?? "Unknown sender"}
                        </p>
                      </div>
                      <Badge variant={item.label === "urgent" ? "destructive" : "outline"} className="capitalize">
                        {(item.label ?? "untriaged").replace("_", " ")}
                      </Badge>
                    </div>
                    <p className="mt-3 text-xs uppercase tracking-[0.24em] text-slate-500">
                      Score {item.score.toFixed(1)}
                    </p>
                  </article>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="rounded-[1.6rem] border-slate-200/80 bg-white/90 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Workflow focus</CardTitle>
              <CardDescription>Quick entry points into the dedicated pages.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/dashboard/inbox" className="flex items-center justify-between rounded-[1.05rem] border border-slate-200/80 bg-slate-50/70 px-4 py-3 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-100/80">
                <span className="inline-flex items-center gap-2">
                  <Inbox className="size-4 text-amber-700" />
                  Priority Inbox
                </span>
                <span>{openThreadCount}</span>
              </Link>
              <Link href="/dashboard/drafts" className="flex items-center justify-between rounded-[1.05rem] border border-slate-200/80 bg-slate-50/70 px-4 py-3 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-100/80">
                <span className="inline-flex items-center gap-2">
                  <FileText className="size-4 text-blue-700" />
                  Draft Center
                </span>
                <span>{pendingDrafts}</span>
              </Link>
              <Link href="/dashboard/meetings" className="flex items-center justify-between rounded-[1.05rem] border border-slate-200/80 bg-slate-50/70 px-4 py-3 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-100/80">
                <span className="inline-flex items-center gap-2">
                  <CalendarRange className="size-4 text-emerald-700" />
                  Meeting Center
                </span>
                <span>{pendingMeetings}</span>
              </Link>
            </CardContent>
          </Card>

          <Card className="rounded-[1.6rem] border-slate-200/80 bg-white/90 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Operational baseline</CardTitle>
              <CardDescription>Supporting signals for knowledge and automation readiness.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-[1.1rem] border border-slate-200/80 bg-slate-50/70 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Connected providers</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                  {connectors.length}
                </p>
              </div>
              <div className="rounded-[1.1rem] border border-slate-200/80 bg-slate-50/70 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Briefing items</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                  {briefingCount}
                </p>
              </div>
              <div className="flex gap-3">
                <Link href="/dashboard/connectors" className={cn(buttonVariants({ variant: "outline" }), "flex-1 rounded-xl")}>
                  Manage connectors
                </Link>
                <Link href="/dashboard/ingestion" className={cn(buttonVariants({ variant: "outline" }), "flex-1 rounded-xl")}>
                  Open ingestion
                </Link>
              </div>
              <Link href="/dashboard/chat" className={cn(buttonVariants({ variant: "default" }), "w-full rounded-xl justify-center")}>
                Open knowledge chat
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
