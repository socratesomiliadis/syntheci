"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Loader2, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";

import type { BriefingItem } from "@syntheci/shared";

import {
  listItemReveal,
  panelReveal,
  panelTransition,
  statusReveal,
  withStagger,
} from "@/components/dashboard/motion-presets";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type BriefingView = {
  briefingDate: string;
  summary: string;
  items: BriefingItem[];
  generatedAt?: string | Date | null;
};

export function BriefingPanel({
  briefing,
  demoMode = false,
}: {
  briefing: BriefingView | null;
  demoMode?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [currentBriefing, setCurrentBriefing] = useState<BriefingView | null>(
    briefing
  );

  useEffect(() => {
    setCurrentBriefing(briefing);
  }, [briefing]);

  const generatedAtLabel = currentBriefing?.generatedAt
    ? new Date(currentBriefing.generatedAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  function refreshDashboard() {
    startTransition(() => {
      router.refresh();
    });
  }

  async function generateLiveBriefing() {
    try {
      const response = await fetch("/api/briefings/generate", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          waitForCompletion: true,
        }),
      });

      if (!response.ok) {
        throw new Error("Could not generate the briefing.");
      }

      const payload = (await response.json()) as {
        completed: boolean;
        briefing?: BriefingView;
      };

      if (payload.briefing) {
        setCurrentBriefing({
          briefingDate: payload.briefing.briefingDate,
          summary: payload.briefing.summary,
          items: payload.briefing.items,
          generatedAt: payload.briefing.generatedAt ?? new Date().toISOString(),
        });
      }

      toast.success(
        payload.completed
          ? "Live briefing generated from the current workspace state."
          : "Briefing queued. It will appear as soon as the worker finishes."
      );
      refreshDashboard();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Briefing generation failed"
      );
    }
  }

  return (
    <motion.section
      initial="initial"
      animate="animate"
      variants={panelReveal}
      transition={panelTransition}
    >
      <Card className="h-full rounded-[1.6rem] border-border/80 bg-card/90 shadow-sm">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="tone-info">
                  09:00 local
                </Badge>
                {demoMode ? (
                  <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700">
                    Live demo mode
                  </Badge>
                ) : null}
              </div>
              <div className="space-y-1">
                <CardTitle className="text-lg">Daily Briefing</CardTitle>
                <CardDescription>
                  Generated from open inbox threads, upcoming meetings, and the
                  current knowledge base.
                </CardDescription>
              </div>
            </div>

            {demoMode ? (
              <div className="rounded-[1.15rem] border border-emerald-500/20 bg-emerald-500/5 p-1.5">
                <Button
                  type="button"
                  size="sm"
                  className="rounded-[0.9rem]"
                  onClick={generateLiveBriefing}
                  disabled={isPending}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-4" />
                      Generate live briefing
                    </>
                  )}
                </Button>
              </div>
            ) : null}
          </div>

          {demoMode ? (
            <div className="grid gap-3 rounded-[1.2rem] border border-border/70 bg-muted/50 p-3 md:grid-cols-[1.1fr_0.9fr]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  Demo action
                </p>
                <p className="mt-2 text-sm text-foreground">
                  Trigger the real briefing workflow on demand and watch the
                  dashboard refresh with a new AI-generated snapshot.
                </p>
              </div>
              <div className="rounded-[1rem] border border-border/70 bg-background/80 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  Last live run
                </p>
                <p className="mt-2 text-sm text-foreground">
                  {generatedAtLabel
                    ? `Generated at ${generatedAtLabel}`
                    : "No live run yet in this session."}
                </p>
              </div>
            </div>
          ) : null}
        </CardHeader>

        <CardContent>
          <AnimatePresence mode="popLayout" initial={false}>
            {!currentBriefing ? (
              <motion.div
                key="briefing-empty"
                layout
                className="rounded-[1.15rem] border border-dashed border-border bg-muted px-4 py-6"
                initial="initial"
                animate="animate"
                exit="exit"
                variants={statusReveal}
              >
                <p className="text-sm text-muted-foreground">
                  No briefing generated yet.
                </p>
              </motion.div>
            ) : (
              <motion.div key="briefing-content" layout className="space-y-4">
                <motion.div
                  layout
                  initial="initial"
                  animate="animate"
                  variants={statusReveal}
                  transition={withStagger(0, 0.05)}
                  className="rounded-[1.2rem] border border-border/80 bg-muted/65 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                      For {currentBriefing.briefingDate}
                    </p>
                    {generatedAtLabel ? (
                      <p className="text-xs text-muted-foreground">
                        Generated {generatedAtLabel}
                      </p>
                    ) : null}
                  </div>
                  <p className="mt-3 text-sm leading-6 text-foreground">
                    {currentBriefing.summary}
                  </p>
                </motion.div>

                <motion.div layout className="grid gap-3 md:grid-cols-2">
                  <AnimatePresence mode="popLayout" initial={false}>
                    {currentBriefing.items.map((item, idx) => (
                      <motion.div
                        layout
                        key={`${item.type}-${idx}`}
                        className="rounded-[1.1rem] border border-border/80 bg-background/85 px-4 py-4"
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        variants={listItemReveal}
                        transition={withStagger(idx)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-foreground">
                              {item.title}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                              {item.reason}
                            </p>
                          </div>
                          <Badge variant="outline" className="capitalize">
                            {item.type}
                          </Badge>
                        </div>
                        <p className="mt-4 text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
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
