import { desc, eq } from "drizzle-orm";

import {
  CalendarRange,
  Cable,
  FileText,
  Inbox,
  LayoutDashboard,
  MessagesSquare,
  Upload
} from "lucide-react";

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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger
} from "@/components/ui/sidebar";
import { getConnectorStatus, getOpenThreadCount, getPriorityInbox } from "@/lib/dashboard";
import { requireWorkspaceContext } from "@/lib/session";

export const dynamic = "force-dynamic";

const navItems = [
  { href: "#overview", icon: LayoutDashboard, label: "Overview" },
  { href: "#connectors", icon: Cable, label: "Connectors" },
  { href: "#chat", icon: MessagesSquare, label: "Knowledge Chat" },
  { href: "#inbox", icon: Inbox, label: "Priority Inbox" },
  { href: "#ingest", icon: Upload, label: "Ingestion" },
  { href: "#drafts", icon: FileText, label: "Draft Center" },
  { href: "#meetings", icon: CalendarRange, label: "Meeting Center" }
];

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

  const briefingCount = latestBriefing ? ((latestBriefing.items as BriefingItem[]) ?? []).length : 0;

  return (
    <SidebarProvider>
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader>
          <div className="rounded-lg border border-sidebar-border/80 bg-sidebar-accent/60 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-sidebar-foreground/70">
              Workspace
            </p>
            <p className="text-sm font-semibold text-sidebar-foreground">Syntheci</p>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton tooltip={item.label} render={<a href={item.href} />}>
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarSeparator />
        <SidebarFooter>
          <div className="space-y-2 rounded-md border border-sidebar-border/80 bg-sidebar-accent/40 px-3 py-2">
            <p className="line-clamp-1 text-xs text-sidebar-foreground/80">{session.user.email}</p>
            <SignOutButton />
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 py-3 backdrop-blur md:px-6">
          <div className="flex items-center gap-3">
            <SidebarTrigger />
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-slate-900">Syntheci Dashboard</h1>
              <p className="text-xs text-slate-500">AI workflow hub for triage, drafting, and meetings</p>
            </div>
          </div>
          <Badge variant="secondary" className="border border-blue-200 bg-blue-50 text-blue-700">
            {openThreadCount} open threads
          </Badge>
        </header>

        <main className="space-y-6 px-4 py-5 md:px-6 md:py-6">
          <section id="overview" className="grid gap-4 md:grid-cols-3">
            <Card className="border-slate-200 bg-gradient-to-br from-white to-blue-50/50 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Connected providers</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-slate-900">{connectors.length}</p>
              </CardContent>
            </Card>
            <Card className="border-slate-200 bg-gradient-to-br from-white to-sky-50/50 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Priority candidates</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-slate-900">{inbox.length}</p>
              </CardContent>
            </Card>
            <Card className="border-slate-200 bg-gradient-to-br from-white to-indigo-50/50 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Briefing items</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-slate-900">{briefingCount}</p>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <div id="connectors">
              <ConnectorsPanel connectors={connectors} />
            </div>
            <div id="briefing">
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
          </section>

          <ChatPanel />
          <IngestPanel />
          <PriorityInbox initialItems={inbox} />

          <section className="grid gap-6 xl:grid-cols-2">
            <div id="drafts">
              <DraftCenter initialDrafts={drafts} />
            </div>
            <div id="meetings">
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
          </section>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
