"use client";

import { useState } from "react";

import { Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";

import type { DraftReplyStatus } from "@syntheci/shared";

import {
  listItemReveal,
  panelReveal,
  panelTransition,
  overlayReveal,
  overlayTransition,
  statusReveal,
  statusTransition,
  withStagger
} from "@/components/dashboard/motion-presets";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface DraftItem {
  id: string;
  messageId: string;
  body: string;
  status: DraftReplyStatus;
  createdAt: Date;
}

export function DraftCenter({ initialDrafts }: { initialDrafts: DraftItem[] }) {
  const [drafts, setDrafts] = useState(initialDrafts);
  const [busyDraftId, setBusyDraftId] = useState<string | null>(null);

  async function updateDraft(draftId: string, action: "approve" | "send") {
    setBusyDraftId(draftId);
    try {
      const response = await fetch(`/api/drafts/${draftId}/${action}`, {
        method: "POST"
      });
      if (!response.ok) throw new Error(`${action} failed`);
      const payload = (await response.json()) as { status: DraftReplyStatus };
      setDrafts((prev) =>
        prev.map((draft) => (draft.id === draftId ? { ...draft, status: payload.status } : draft))
      );
      toast.success(`Draft ${action}d successfully.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `${action} failed`);
    } finally {
      setBusyDraftId(null);
    }
  }

  return (
    <motion.section initial="initial" animate="animate" variants={panelReveal} transition={panelTransition}>
      <Card className="border-border shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-lg">Draft Center</CardTitle>
            <Badge variant="secondary" className="tone-info">
              Approval required
            </Badge>
          </div>
          <CardDescription>Review, approve, and send generated email replies.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          <AnimatePresence mode="popLayout" initial={false}>
            {drafts.length === 0 ? (
              <motion.p
                key="draft-empty"
                layout
                className="rounded-lg border border-dashed border-border bg-muted px-3 py-6 text-sm text-muted-foreground"
                initial="initial"
                animate="animate"
                exit="exit"
                variants={statusReveal}
                transition={statusTransition}
              >
                No drafts yet.
              </motion.p>
            ) : (
              <motion.div key="draft-list" layout className="space-y-3">
                <AnimatePresence mode="popLayout" initial={false}>
                  {drafts.map((draft, index) => (
                    <motion.article
                      key={draft.id}
                      layout
                      className="relative space-y-3 overflow-hidden rounded-lg border border-border bg-muted/70 p-3"
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      variants={listItemReveal}
                      transition={withStagger(index)}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-foreground">{draft.messageId}</p>
                          <p className="text-xs text-muted-foreground">
                            Created {new Date(draft.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <Badge variant="outline" className="capitalize">
                          {draft.status}
                        </Badge>
                      </div>

                      <p className="line-clamp-6 whitespace-pre-wrap rounded-md bg-card px-3 py-2 text-sm text-foreground">
                        {draft.body}
                      </p>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => updateDraft(draft.id, "approve")}
                          disabled={busyDraftId === draft.id || draft.status !== "generated"}
                        >
                          Approve
                        </Button>
                        <Button
                          type="button"
                          onClick={() => updateDraft(draft.id, "send")}
                          disabled={busyDraftId === draft.id || draft.status !== "approved"}
                        >
                          Send now
                        </Button>
                      </div>

                      <AnimatePresence mode="popLayout" initial={false}>
                        {busyDraftId === draft.id ? (
                          <motion.div
                            key={`${draft.id}-busy`}
                            className="pointer-events-none absolute inset-0 flex items-center justify-center bg-card/65 backdrop-blur-[2px]"
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            variants={overlayReveal}
                            transition={overlayTransition}
                          >
                            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm">
                              <Loader2 className="size-3.5 animate-spin text-blue-600" />
                              Updating draft...
                            </span>
                          </motion.div>
                        ) : null}
                      </AnimatePresence>
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
