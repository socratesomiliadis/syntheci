"use client";

import { Link2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import {
  listItemReveal,
  panelReveal,
  panelTransition,
  statusReveal,
  withStagger
} from "@/components/dashboard/motion-presets";
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
    <motion.section initial="initial" animate="animate" variants={panelReveal} transition={panelTransition}>
      <Card className="h-full border-slate-200 shadow-sm">
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-lg">Connectors</CardTitle>
            <Badge variant="secondary" className="border border-blue-200 bg-blue-50 text-blue-700">
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
              className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2"
            >
              <p className="text-xs uppercase tracking-wide text-slate-500">Connected</p>
              <p className="text-xl font-semibold text-slate-800">{connectors.length}</p>
            </motion.div>
            <motion.div
              initial="initial"
              animate="animate"
              variants={statusReveal}
              transition={withStagger(1, 0.05)}
              className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2"
            >
              <p className="text-xs uppercase tracking-wide text-slate-500">Providers</p>
              <p className="text-xl font-semibold text-slate-800">Gmail, Calendar</p>
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
          </div>

          <AnimatePresence mode="popLayout" initial={false}>
            {connectors.length === 0 ? (
              <motion.p
                key="connectors-empty"
                layout
                className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-6 text-sm text-slate-500"
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
                      className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-3"
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      variants={listItemReveal}
                      transition={withStagger(index)}
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
