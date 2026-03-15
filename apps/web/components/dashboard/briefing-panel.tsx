"use client";

import { AnimatePresence, motion } from "motion/react";

import type { BriefingItem } from "@syntheci/shared";

import {
  listItemReveal,
  panelReveal,
  panelTransition,
  statusReveal,
  withStagger,
} from "@/components/dashboard/motion-presets";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function BriefingPanel({
  briefing,
}: {
  briefing: {
    briefingDate: string;
    summary: string;
    items: BriefingItem[];
  } | null;
}) {
  return (
    <motion.section
      initial="initial"
      animate="animate"
      variants={panelReveal}
      transition={panelTransition}
    >
      <Card className="h-full border-border shadow-sm">
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-lg">Daily Briefing</CardTitle>
            <Badge variant="secondary" className="tone-info">
              09:00 local
            </Badge>
          </div>
          <CardDescription>
            Concise priorities generated from inbox, notes, and meetings.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <AnimatePresence mode="popLayout" initial={false}>
            {!briefing ? (
              <motion.p
                key="briefing-empty"
                layout
                className="rounded-lg border border-dashed border-border bg-muted px-3 py-6 text-sm text-muted-foreground"
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
                  className="space-y-2 rounded-lg border border-border bg-muted/70 p-3"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    For {briefing.briefingDate}
                  </p>
                  <p className="text-sm text-foreground">{briefing.summary}</p>
                </motion.div>

                <motion.div layout className="grid grid-cols-2 gap-3">
                  <AnimatePresence mode="popLayout" initial={false}>
                    {briefing.items.map((item, idx) => (
                      <motion.div
                        layout
                        key={`${item.type}-${idx}`}
                        className="rounded-lg border border-border bg-muted/70 px-3 py-3"
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        variants={listItemReveal}
                        transition={withStagger(idx)}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium text-foreground">
                            {item.title}
                          </p>
                          <Badge variant="outline" className="capitalize">
                            {item.type}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {item.reason}
                        </p>
                        <p className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                          {item.sourceRefs.length} source reference
                          {item.sourceRefs.length === 1 ? "" : "s"}
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
