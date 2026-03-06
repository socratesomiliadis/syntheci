"use client";

import { useState } from "react";

import { Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

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
  const [status, setStatus] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<"success" | "error">("success");

  async function updateDraft(draftId: string, action: "approve" | "send") {
    setBusyDraftId(draftId);
    setStatus(null);
    try {
      const response = await fetch(`/api/drafts/${draftId}/${action}`, {
        method: "POST"
      });
      if (!response.ok) throw new Error(`${action} failed`);
      const payload = (await response.json()) as { status: DraftReplyStatus };
      setDrafts((prev) =>
        prev.map((draft) => (draft.id === draftId ? { ...draft, status: payload.status } : draft))
      );
      setStatusTone("success");
      setStatus(`Draft ${action}d successfully.`);
    } catch (error) {
      setStatusTone("error");
      setStatus(error instanceof Error ? error.message : `${action} failed`);
    } finally {
      setBusyDraftId(null);
    }
  }

  return (
    <motion.section initial="initial" animate="animate" variants={panelReveal} transition={panelTransition}>
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-lg">Draft Center</CardTitle>
            <Badge variant="secondary" className="border border-blue-200 bg-blue-50 text-blue-700">
              Approval required
            </Badge>
          </div>
          <CardDescription>Review, approve, and send generated email replies.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          <AnimatePresence mode="popLayout" initial={false}>
            {status ? (
              <motion.p
                key={`draft-status-${statusTone}-${status}`}
                layout
                className={
                  statusTone === "error"
                    ? "rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                    : "rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
                }
                initial="initial"
                animate="animate"
                exit="exit"
                variants={statusReveal}
                transition={statusTransition}
              >
                {status}
              </motion.p>
            ) : null}
          </AnimatePresence>

          <AnimatePresence mode="popLayout" initial={false}>
            {drafts.length === 0 ? (
              <motion.p
                key="draft-empty"
                layout
                className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-6 text-sm text-slate-500"
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
                      className="relative space-y-3 overflow-hidden rounded-lg border border-slate-200 bg-slate-50/70 p-3"
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      variants={listItemReveal}
                      transition={withStagger(index)}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-slate-800">{draft.messageId}</p>
                          <p className="text-xs text-slate-500">
                            Created {new Date(draft.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <Badge variant="outline" className="capitalize">
                          {draft.status}
                        </Badge>
                      </div>

                      <p className="line-clamp-6 whitespace-pre-wrap rounded-md bg-white px-3 py-2 text-sm text-slate-700">
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
                            className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/65 backdrop-blur-[2px]"
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            variants={overlayReveal}
                            transition={overlayTransition}
                          >
                            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm">
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
