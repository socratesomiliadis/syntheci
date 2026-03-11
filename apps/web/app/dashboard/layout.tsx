import { eq } from "drizzle-orm";

import { db, workspaces } from "@syntheci/db";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getOpenThreadCount } from "@/lib/dashboard";
import { requireWorkspaceContext } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { session, workspaceId } = await requireWorkspaceContext();

  const [workspace, openThreadCount] = await Promise.all([
    db.query.workspaces.findFirst({
      where: eq(workspaces.id, workspaceId),
      columns: {
        name: true
      }
    }),
    getOpenThreadCount(workspaceId)
  ]);

  return (
    <DashboardShell
      workspaceName={workspace?.name ?? "Syntheci"}
      openThreadCount={openThreadCount}
      userEmail={session.user.email}
    >
      {children}
    </DashboardShell>
  );
}
