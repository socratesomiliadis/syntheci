"use client";

import { AnimatePresence, motion } from "motion/react";

import type { BriefingItem } from "@syntheci/shared";

import {
  listItemReveal,
  panelReveal,
  panelTransition,
  statusReveal,
  withStagger
} from "@/components/dashboard/motion-presets";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function BriefingPanel({
  briefing
}: {
  briefing:
    | {
        briefingDate: string;
        summary: string;
        items: BriefingItem[];
      }
    | null;
}) {
  return (
    <motion.section initial="initial" animate="animate" variants={panelReveal} transition={panelTransition}>
      <Card className="h-full border-slate-200 shadow-sm">
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-lg">Daily Briefing</CardTitle>
            <Badge variant="secondary" className="border border-blue-200 bg-blue-50 text-blue-700">
              09:00 local
            </Badge>
          </div>
          <CardDescription>Concise priorities generated from inbox, notes, and meetings.</CardDescription>
        </CardHeader>

        <CardContent>
          <AnimatePresence mode="popLayout" initial={false}>
            {!briefing ? (
              <motion.p
                key="briefing-empty"
                layout
                className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-6 text-sm text-slate-500"
                initial="initial"
                animate="animate"
                exit="exit"
                variants={statusReveal}
              >
                No briefing generated yet.
              </motion.p>
            ) : (
              <motion.div key="briefing-content" layout className="space-y-4">
                <motion.div
                  layout
                  initial="initial"
                  animate="animate"
                  variants={statusReveal}
                  transition={withStagger(0, 0.05)}
                  className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/70 p-3"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    For {briefing.briefingDate}
                  </p>
                  <p className="text-sm text-slate-700">{briefing.summary}</p>
                </motion.div>

                <motion.div layout className="space-y-3">
                  <AnimatePresence mode="popLayout" initial={false}>
                    {briefing.items.map((item, idx) => (
                      <motion.div
                        layout
                        key={`${item.type}-${idx}`}
                        className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-3"
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        variants={listItemReveal}
                        transition={withStagger(idx)}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium text-slate-800">{item.title}</p>
                          <Badge variant="outline" className="capitalize">
                            {item.type}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-slate-600">{item.reason}</p>
                        <p className="mt-2 text-[11px] uppercase tracking-wide text-slate-500">
                          {item.sourceRefs.length} source reference{item.sourceRefs.length === 1 ? "" : "s"}
                        </p>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.section>
  );
}
