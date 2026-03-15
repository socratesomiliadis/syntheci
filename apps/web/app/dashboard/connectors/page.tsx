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
    <main className="space-y-4 px-4 py-5 md:px-6 md:py-6">
      <section className="flex flex-col gap-3 xl:flex-row xl:items-stretch xl:justify-between">
        <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[28rem]">
          <Card className="border-border/80 bg-card/90 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-foreground">Connected accounts</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tracking-tight text-foreground">{connectors.length}</p>
            </CardContent>
          </Card>
          <Card className="border-border/80 bg-card/90 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-foreground">Latest sync activity</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium text-foreground">{latestSync}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border/80 bg-card/90 shadow-sm xl:min-w-[22rem]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-foreground">Workspace connections</CardTitle>
            <CardDescription>Link Google once, then manage sync from the panel below.</CardDescription>
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
      </section>

      <div id="connector-panel">
        <ConnectorsPanel connectors={connectors} />
      </div>
    </main>
  );
}
