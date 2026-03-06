import { Link2, Slack } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ConnectorStatus {
  id: string;
  provider: string;
  scopes: string[];
  updatedAt: Date;
}

export function ConnectorsPanel({ connectors }: { connectors: ConnectorStatus[] }) {
  return (
    <Card className="h-full border-slate-200 shadow-sm">
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-lg">Connectors</CardTitle>
          <Badge variant="secondary" className="border border-blue-200 bg-blue-50 text-blue-700">
            Gmail + Slack
          </Badge>
        </div>
        <CardDescription>Connect channels to keep the workspace synced continuously.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2">
            <p className="text-xs uppercase tracking-wide text-slate-500">Connected</p>
            <p className="text-xl font-semibold text-slate-800">{connectors.length}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2">
            <p className="text-xs uppercase tracking-wide text-slate-500">Providers</p>
            <p className="text-xl font-semibold text-slate-800">Gmail, Slack</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <a
            href="/api/connect/google/start"
            className={cn(buttonVariants({ variant: "default" }), "inline-flex")}
          >
            <Link2 className="mr-2 size-4" />
            Connect Gmail/Calendar
          </a>
          <a
            href="/api/connect/slack/start"
            className={cn(buttonVariants({ variant: "outline" }), "inline-flex")}
          >
            <Slack className="mr-2 size-4" />
            Connect Slack
          </a>
        </div>

        {connectors.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-6 text-sm text-slate-500">
            No connectors yet. Start by linking Gmail or Slack.
          </p>
        ) : (
          <div className="space-y-3">
            {connectors.map((connector) => (
              <article
                key={connector.id}
                className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-slate-800">{connector.provider}</p>
                  <span className="text-xs text-slate-500">
                    Updated {new Date(connector.updatedAt).toLocaleString()}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  Scopes: {connector.scopes.join(", ") || "(none)"}
                </p>
              </article>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
