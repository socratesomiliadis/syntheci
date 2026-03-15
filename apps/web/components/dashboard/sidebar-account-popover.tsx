"use client";

import Link from "next/link";
import { useState } from "react";

import { Inbox, LayoutDashboard, Loader2, LogOut, MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

function getDisplayName(userName: string | null | undefined, userEmail: string) {
  if (userName?.trim()) {
    return userName.trim();
  }

  const [localPart] = userEmail.split("@");
  return localPart || "Account";
}

function getInitials(label: string) {
  return label
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function SidebarAccountPopover({
  userName,
  userEmail,
  workspaceName
}: {
  userName?: string | null;
  userEmail: string;
  workspaceName: string;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const displayName = getDisplayName(userName, userEmail);
  const initials = getInitials(displayName);

  async function onSignOut() {
    setIsLoading(true);
    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            window.location.href = "/login";
          }
        }
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "flex w-full items-center gap-3 rounded-xl border border-sidebar-border/80 bg-sidebar-accent/45 px-3 py-2.5 text-left text-sidebar-foreground transition hover:bg-sidebar-accent/70",
          "group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
        )}
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sidebar text-xs font-semibold text-sidebar-foreground ring-1 ring-sidebar-border/80">
          {initials || "A"}
        </span>
        <span className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
          <span className="block truncate text-sm font-medium text-sidebar-foreground">{displayName}</span>
          <span className="block truncate text-xs text-sidebar-foreground/65">{userEmail}</span>
        </span>
        <MoreHorizontal className="size-4 shrink-0 text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden" />
      </PopoverTrigger>

      <PopoverContent
        side="top"
        align="start"
        sideOffset={12}
        className="w-72 rounded-[1.2rem] border-border bg-background p-2 shadow-[0_18px_40px_rgba(15,23,42,0.14)]"
      >
        <div className="rounded-[1rem] border border-border bg-muted/50 p-3">
          <p className="text-sm font-medium text-foreground">{displayName}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{userEmail}</p>
          <p className="mt-2 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{workspaceName}</p>
        </div>

        <div className="mt-2 space-y-1">
          <Button asChild variant="ghost" className="w-full justify-start rounded-xl">
            <Link href="/dashboard">
              <LayoutDashboard className="size-4" />
              Overview
            </Link>
          </Button>
          <Button asChild variant="ghost" className="w-full justify-start rounded-xl">
            <Link href="/dashboard/inbox">
              <Inbox className="size-4" />
              Priority inbox
            </Link>
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full justify-start rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => void onSignOut()}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
            {isLoading ? "Signing out..." : "Log out"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
