"use client";

import { useState } from "react";

import { Link2, Loader2, RefreshCw } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";

import {
  listItemReveal,
  panelReveal,
  panelTransition,
  statusReveal,
  withStagger
} from "@/components/dashboard/motion-presets";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button-variants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ConnectorStatus {
  id: string;
  provider: string;
  scopes: string[];
  updatedAt: Date;
}

export function ConnectorsPanel({ connectors }: { connectors: ConnectorStatus[] }) {
  const [isSyncing, setIsSyncing] = useState(false);

  async function syncGmail() {
    setIsSyncing(true);

    try {
      const response = await fetch("/api/connectors/google/sync", {
        method: "POST"
      });

      if (!response.ok) {
        throw new Error(response.status === 404 ? "Connect Gmail first." : "Gmail sync failed.");
      }

      const payload = (await response.json()) as {
        queued: number;
      };

      toast.success(
        payload.queued === 1
          ? "Gmail sync queued. Refresh in a few seconds."
          : `${payload.queued} Gmail sync jobs queued.`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gmail sync failed.");
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <motion.section initial="initial" animate="animate" variants={panelReveal} transition={panelTransition}>
      <Card className="h-full border-border shadow-sm">
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-lg">Connectors</CardTitle>
            <Badge variant="secondary" className="tone-info">
              Google
            </Badge>
          </div>
          <CardDescription>Connect Gmail and Calendar to keep the workspace synced.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <motion.div
              initial="initial"
              animate="animate"
              variants={statusReveal}
              transition={withStagger(0, 0.05)}
              className="rounded-lg border border-border bg-muted/70 px-3 py-2"
            >
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Connected</p>
              <p className="text-xl font-semibold text-foreground">{connectors.length}</p>
            </motion.div>
            <motion.div
              initial="initial"
              animate="animate"
              variants={statusReveal}
              transition={withStagger(1, 0.05)}
              className="rounded-lg border border-border bg-muted/70 px-3 py-2"
            >
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Providers</p>
              <p className="text-xl font-semibold text-foreground">Gmail, Calendar</p>
            </motion.div>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href="/api/connect/google/start"
              className={cn(buttonVariants({ variant: "default" }), "inline-flex")}
            >
              <Link2 className="mr-2 size-4" />
              Connect Gmail/Calendar
            </a>
            <Button type="button" variant="outline" onClick={() => void syncGmail()} disabled={isSyncing}>
              {isSyncing ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 size-4" />
              )}
              Sync Gmail Now
            </Button>
          </div>

          <AnimatePresence mode="popLayout" initial={false}>
            {connectors.length === 0 ? (
              <motion.p
                key="connectors-empty"
                layout
                className="rounded-lg border border-dashed border-border bg-muted px-3 py-6 text-sm text-muted-foreground"
                initial="initial"
                animate="animate"
                exit="exit"
                variants={statusReveal}
              >
                No connectors yet. Start by linking Gmail and Calendar.
              </motion.p>
            ) : (
              <motion.div key="connectors-list" layout className="space-y-3">
                <AnimatePresence mode="popLayout" initial={false}>
                  {connectors.map((connector, index) => (
                    <motion.article
                      key={connector.id}
                      layout
                      className="rounded-lg border border-border bg-muted/70 px-3 py-3"
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      variants={listItemReveal}
                      transition={withStagger(index)}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-foreground">{connector.provider}</p>
                        <span className="text-xs text-muted-foreground">
                          Updated {new Date(connector.updatedAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Scopes: {connector.scopes.join(", ") || "(none)"}
                      </p>
                    </motion.article>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.section>
  );
}
