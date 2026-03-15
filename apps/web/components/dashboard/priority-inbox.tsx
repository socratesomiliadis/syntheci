"use client";

import { useState } from "react";

import { Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import type { TriageLabel } from "@syntheci/shared";

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

interface InboxItem {
  id: string;
  subject: string | null;
  senderName: string | null;
  senderEmail: string | null;
  receivedAt: Date;
  isUnread: boolean;
  label: TriageLabel | null;
  confidence: number | null;
  score: number;
}

export function PriorityInbox({ initialItems }: { initialItems: InboxItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [status, setStatus] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<"success" | "error">("success");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function triageMessage(messageId: string) {
    setBusyId(messageId);
    setStatus(null);
    try {
      const response = await fetch("/api/triage", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messageId })
      });
      if (!response.ok) throw new Error("Triage failed");
      const payload = (await response.json()) as {
        label: TriageLabel;
        confidence: number;
      };

      setItems((prev) =>
        prev.map((item) =>
          item.id === messageId ? { ...item, label: payload.label, confidence: payload.confidence } : item
        )
      );
      setStatusTone("success");
      setStatus("Triage refreshed.");
    } catch (error) {
      setStatusTone("error");
      setStatus(error instanceof Error ? error.message : "Triage failed");
    } finally {
      setBusyId(null);
    }
  }

  async function generateDraft(messageId: string) {
    setBusyId(messageId);
    try {
      const response = await fetch("/api/drafts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messageId })
      });
      if (!response.ok) throw new Error("Draft generation failed");
      setStatusTone("success");
      setStatus("Draft generated. Open draft center to approve/send.");
    } catch (error) {
      setStatusTone("error");
      setStatus(error instanceof Error ? error.message : "Draft failed");
    } finally {
      setBusyId(null);
    }
  }

  async function proposeMeeting(messageId: string) {
    setBusyId(messageId);
    try {
      const response = await fetch("/api/meetings/proposals", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messageId })
      });
      if (!response.ok) throw new Error("Meeting extraction failed");
      setStatusTone("success");
      setStatus("Meeting proposal generated.");
    } catch (error) {
      setStatusTone("error");
      setStatus(error instanceof Error ? error.message : "Meeting extraction failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <motion.section
      id="inbox"
      initial="initial"
      animate="animate"
      variants={panelReveal}
      transition={panelTransition}
    >
      <Card className="border-border shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-lg">Priority Inbox</CardTitle>
            <Badge variant="secondary" className="tone-info">
              Triage + actioning
            </Badge>
          </div>
          <CardDescription>Ranked message queue with one-click reply and scheduling actions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <AnimatePresence mode="popLayout" initial={false}>
            {status ? (
              <motion.p
                key={`inbox-status-${statusTone}-${status}`}
                layout
                className={
                  statusTone === "error"
                    ? "rounded-lg tone-danger px-3 py-2 text-sm"
                    : "rounded-lg tone-success px-3 py-2 text-sm"
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
            {items.length === 0 ? (
              <motion.p
                key="inbox-empty"
                layout
                className="rounded-lg border border-dashed border-border bg-muted px-3 py-6 text-sm text-muted-foreground"
                initial="initial"
                animate="animate"
                exit="exit"
                variants={statusReveal}
                transition={statusTransition}
              >
                No messages yet.
              </motion.p>
            ) : (
              <motion.div key="inbox-list" layout className="space-y-3">
                <AnimatePresence mode="popLayout" initial={false}>
                  {items.map((item, index) => (
                    <motion.article
                      key={item.id}
                      layout
                      className="relative space-y-3 overflow-hidden rounded-lg border border-border bg-muted/70 p-3"
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      variants={listItemReveal}
                      transition={withStagger(index)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-foreground">{item.subject ?? "(no subject)"}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {item.senderName ?? item.senderEmail ?? "Unknown sender"} Ã¢â‚¬Â¢{" "}
                            {new Date(item.receivedAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge
                            variant={item.label === "urgent" ? "destructive" : "outline"}
                            className="capitalize"
                          >
                            {(item.label ?? "untriaged").replace("_", " ")}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            score {item.score.toFixed(1)}
                            {typeof item.confidence === "number"
                              ? ` Ã¢â‚¬Â¢ ${(item.confidence * 100).toFixed(0)}% confidence`
                              : ""}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => triageMessage(item.id)}
                          disabled={busyId === item.id}
                        >
                          Re-triage
                        </Button>
                        <Button
                          type="button"
                          onClick={() => generateDraft(item.id)}
                          disabled={busyId === item.id}
                        >
                          Draft reply
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => proposeMeeting(item.id)}
                          disabled={busyId === item.id}
                        >
                          Extract meeting
                        </Button>
                      </div>

                      <AnimatePresence mode="popLayout" initial={false}>
                        {busyId === item.id ? (
                          <motion.div
                            key={`${item.id}-busy`}
                            className="pointer-events-none absolute inset-0 flex items-center justify-center bg-card/70 backdrop-blur-[2px]"
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            variants={overlayReveal}
                            transition={overlayTransition}
                          >
                            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
                              <Loader2 className="size-3.5 animate-spin text-blue-600" />
                              Running action...
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
