import type { LucideIcon } from "lucide-react";
import {
  Cable,
  CalendarRange,
  FileText,
  Inbox,
  LayoutDashboard,
  MessagesSquare,
  Upload
} from "lucide-react";

export interface DashboardNavItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const dashboardNavItems: DashboardNavItem[] = [
  {
    href: "/dashboard",
    label: "Overview",
    description: "Urgent work and today’s context",
    icon: LayoutDashboard
  },
  {
    href: "/dashboard/connectors",
    label: "Connectors",
    description: "Provider status and sync actions",
    icon: Cable
  },
  {
    href: "/dashboard/chat",
    label: "Knowledge Chat",
    description: "Grounded conversations with history",
    icon: MessagesSquare
  },
  {
    href: "/dashboard/inbox",
    label: "Priority Inbox",
    description: "Ranked message queue and actions",
    icon: Inbox
  },
  {
    href: "/dashboard/ingestion",
    label: "Ingestion",
    description: "Upload notes, links, and files",
    icon: Upload
  },
  {
    href: "/dashboard/drafts",
    label: "Draft Center",
    description: "Review and send generated replies",
    icon: FileText
  },
  {
    href: "/dashboard/meetings",
    label: "Meeting Center",
    description: "Approve and schedule proposals",
    icon: CalendarRange
  }
];

export function getDashboardPageMeta(pathname: string) {
  const activeItem =
    dashboardNavItems.find((item) =>
      item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href)
    ) ?? dashboardNavItems[0]!;

  return {
    eyebrow: "Workflow cockpit",
    title: activeItem.label,
    description: activeItem.description
  };
}
