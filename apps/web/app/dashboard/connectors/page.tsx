import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConnectorsPanel } from "@/components/dashboard/connectors-panel";
import { buttonVariants } from "@/components/ui/button-variants";
import { getConnectorStatus } from "@/lib/dashboard";
import { requireWorkspaceContext } from "@/lib/session";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ConnectorsPage() {
  const { workspaceId } = await requireWorkspaceContext();
  const connectors = await getConnectorStatus(workspaceId);
  const latestSync = connectors[0]?.updatedAt ? new Date(connectors[0].updatedAt).toLocaleString() : "No sync yet";

  return (
    <main className="space-y-6 px-4 py-5 md:px-6 md:py-6">
      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-[1.75rem] border-slate-200/80 bg-white/90 shadow-sm">
          <CardHeader>
            <CardTitle className="text-3xl tracking-tight text-slate-950">Connect the workspace to live systems</CardTitle>
            <CardDescription className="max-w-2xl text-base text-slate-600">
              Keep Gmail and Calendar synchronized so triage, drafting, meetings, and retrieval all work from current context.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <a href="/api/connect/google/start" className={cn(buttonVariants({ variant: "default" }), "rounded-xl")}>
              Connect Google
            </a>
            <Link href="/dashboard/connectors" className={cn(buttonVariants({ variant: "outline" }), "rounded-xl")}>
              Refresh status
            </Link>
          </CardContent>
        </Card>

        <section className="grid gap-4 sm:grid-cols-2">
          <Card className="rounded-[1.4rem] border-slate-200/80 bg-white/90 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-700">Connected accounts</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-semibold tracking-tight text-slate-950">{connectors.length}</p>
            </CardContent>
          </Card>
          <Card className="rounded-[1.4rem] border-slate-200/80 bg-white/90 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-700">Latest sync activity</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium text-slate-900">{latestSync}</p>
            </CardContent>
          </Card>
        </section>
      </section>

      <div id="connector-panel">
        <ConnectorsPanel connectors={connectors} />
      </div>
    </main>
  );
}
