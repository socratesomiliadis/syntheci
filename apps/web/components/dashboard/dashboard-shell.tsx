"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { TextMorph } from "torph/react";
import { SyntheciLogo } from "@/components/brand/syntheci-logo";
import {
  dashboardNavItems,
  getDashboardPageMeta,
} from "@/components/dashboard/navigation";
import { SidebarAccountPopover } from "@/components/dashboard/sidebar-account-popover";
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
import { cn } from "@/lib/utils";

interface DashboardShellProps {
  children: React.ReactNode;
  openThreadCount: number;
  workspaceName: string;
  userEmail: string;
  userName?: string | null;
}

export function DashboardShell({
  children,
  openThreadCount,
  workspaceName,
  userEmail,
  userName,
}: DashboardShellProps) {
  const pathname = usePathname();
  const pageMeta = getDashboardPageMeta(pathname);
  const isChatRoute = pathname.startsWith("/dashboard/chat");

  return (
    <SidebarProvider>
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader className="gap-3 p-3 overflow-hidden">
          <SyntheciLogo className="w-32" />
          {/* <div className="rounded-2xl border border-sidebar-border/80 bg-sidebar-accent/70 px-3 py-3">
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
          </div> */}
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
                        className="h-auto items-center gap-3 rounded-xl px-3 py-2"
                        render={<Link href={item.href} />}
                      >
                        <item.icon />
                        <span className="flex min-w-0 flex-col items-start">
                          <span>{item.label}</span>
                          {/* <span className="truncate text-[11px] font-normal text-sidebar-foreground/60">
                            {item.description}
                          </span> */}
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
          <SidebarAccountPopover
            userName={userName}
            userEmail={userEmail}
            workspaceName={workspaceName}
          />
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="h-svh overflow-hidden border border-border/60 bg-background md:h-[calc(100svh-1rem)]">
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col",
            isChatRoute ? "overflow-hidden" : "overflow-y-auto"
          )}
        >
          <header className="sticky top-0 z-20 shrink-0 border-b border-border/80 bg-white/30 px-4 py-3 backdrop-blur md:px-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <SidebarTrigger className="[&_svg]:size-8" />
                <div className="flex flex-col">
                  <TextMorph
                    as="h1"
                    className="text-lg font-semibold tracking-tight text-foreground leading-none"
                  >
                    {pageMeta.title}
                  </TextMorph>
                  <TextMorph as="p" className="text-sm text-muted-foreground">
                    {pageMeta.description}
                  </TextMorph>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge className="tone-warning">
                  {openThreadCount} open threads
                </Badge>
              </div>
            </div>
          </header>

          <div
            className={cn("min-h-0 flex-1", isChatRoute && "overflow-hidden")}
          >
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
