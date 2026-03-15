"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Sparkles } from "lucide-react";
import { TextMorph } from "torph/react";
import {
  dashboardNavItems,
  getDashboardPageMeta,
} from "@/components/dashboard/navigation";
import { SignOutButton } from "@/components/dashboard/sign-out-button";
import { Badge } from "@/components/ui/badge";
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
  SidebarTrigger,
} from "@/components/ui/sidebar";

interface DashboardShellProps {
  children: React.ReactNode;
  openThreadCount: number;
  workspaceName: string;
  userEmail: string;
}

export function DashboardShell({
  children,
  openThreadCount,
  workspaceName,
  userEmail,
}: DashboardShellProps) {
  const pathname = usePathname();
  const pageMeta = getDashboardPageMeta(pathname);

  return (
    <SidebarProvider>
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader className="gap-3 p-3">
        <div className="overflow-hidden rounded-[1.25rem] border border-sidebar-border/80 bg-sidebar px-3 py-3 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-sidebar-foreground/55">
              Workspace
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-sidebar-foreground">
              {workspaceName}
            </p>
            <p className="mt-2 text-xs text-sidebar-foreground/70">
              Triage, drafting, retrieval, and meetings in one operating system.
            </p>
          </div>
          <div className="rounded-2xl border border-sidebar-border/80 bg-sidebar-accent/70 px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sidebar-foreground/60">
              Right now
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-sidebar-foreground">
                {openThreadCount}
              </span>
              <span className="text-xs text-sidebar-foreground/70">
                open threads
              </span>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {dashboardNavItems.map((item) => {
                  const isActive =
                    item.href === "/dashboard"
                      ? pathname === item.href
                      : pathname.startsWith(item.href);

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        isActive={isActive}
                        tooltip={item.label}
                        className="h-auto min-h-11 items-start gap-3 rounded-xl px-3 py-2.5"
                        render={<Link href={item.href} />}
                      >
                        <item.icon className="mt-0.5" />
                        <span className="flex min-w-0 flex-col items-start">
                          <span>{item.label}</span>
                          <span className="truncate text-[11px] font-normal text-sidebar-foreground/60">
                            {item.description}
                          </span>
                        </span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarSeparator />

        <SidebarFooter className="p-3">
          <div className="space-y-3 rounded-[1.15rem] border border-sidebar-border/80 bg-sidebar-accent/50 p-3">
            <p className="truncate text-xs text-sidebar-foreground/80">
              {userEmail}
            </p>
            <SignOutButton />
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="overflow-hidden border border-border/60 bg-background">
        <header className="sticky top-0 z-20 border-b border-border/80 bg-card/82 px-4 py-4 backdrop-blur-xl md:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <SidebarTrigger className="mt-1" />
              <div className="space-y-1">
                {/* <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                  {pageMeta.eyebrow}
                </p> */}
                <div className="flex flex-col">
                  <TextMorph
                    as="h1"
                    className="text-xl font-semibold tracking-tight text-foreground"
                  >
                    {pageMeta.title}
                  </TextMorph>
                  <TextMorph as="p" className="text-sm text-muted-foreground">
                    {pageMeta.description}
                  </TextMorph>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="border-border bg-card/70 text-muted-foreground"
              >
                <Sparkles className="mr-1 size-3.5" />
                AI workflow hub
              </Badge>
              <Badge className="tone-warning">
                {openThreadCount} open threads
              </Badge>
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
