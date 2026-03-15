"use client";

import { useState } from "react";

import { Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";

import type { TriageLabel } from "@syntheci/shared";

import {
  listItemReveal,
  overlayReveal,
  overlayTransition,
  panelReveal,
  panelTransition,
  statusReveal,
  statusTransition,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface InboxItem {
  id: string;
  subject: string | null;
  textBody: string;
  htmlBody: string | null;
  senderName: string | null;
  senderEmail: string | null;
  receivedAt: Date;
  isUnread: boolean;
  label: TriageLabel | null;
  confidence: number | null;
  score: number;
}

function getPreview(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function buildEmailDocument(htmlBody: string) {
  if (/<html[\s>]/i.test(htmlBody) || /<body[\s>]/i.test(htmlBody)) {
    return htmlBody;
  }

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      :root {
        color-scheme: light;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        padding: 24px;
        font-family: ui-sans-serif, system-ui, sans-serif;
        line-height: 1.55;
        color: #111827;
        background: #ffffff;
      }

      img {
        max-width: 100%;
        height: auto;
      }

      table {
        max-width: 100%;
      }
    </style>
  </head>
  <body>${htmlBody}</body>
</html>`;
}

export function PriorityInbox({ initialItems }: { initialItems: InboxItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(
    null
  );

  const selectedMessage =
    items.find((item) => item.id === selectedMessageId) ?? null;

  async function triageMessage(messageId: string) {
    setBusyId(messageId);
    try {
      const response = await fetch("/api/triage", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messageId }),
      });
      if (!response.ok) throw new Error("Triage failed");
      const payload = (await response.json()) as {
        label: TriageLabel;
        confidence: number;
      };

      setItems((prev) =>
        prev.map((item) =>
          item.id === messageId
            ? { ...item, label: payload.label, confidence: payload.confidence }
            : item
        )
      );
      toast.success("Triage refreshed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Triage failed");
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
        body: JSON.stringify({ messageId }),
      });
      if (!response.ok) throw new Error("Draft generation failed");
      toast.success("Draft generated. Open draft center to approve/send.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Draft failed");
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
        body: JSON.stringify({ messageId }),
      });
      if (!response.ok) throw new Error("Meeting extraction failed");
      toast.success("Meeting proposal generated.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Meeting extraction failed"
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
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
            <CardDescription>
              Ranked message queue with one-click reply and scheduling actions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
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
                <motion.div
                  key="inbox-list"
                  layout
                  className="grid grid-cols-2 gap-4"
                >
                  <AnimatePresence mode="popLayout" initial={false}>
                    {items.map((item, index) => {
                      const preview = getPreview(item.textBody);
                      const sender =
                        item.senderName ?? item.senderEmail ?? "Unknown sender";
                      const receivedAt = new Date(
                        item.receivedAt
                      ).toLocaleString();

                      return (
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
                            <div className="space-y-1">
                              <p className="font-medium text-foreground">
                                {item.subject ?? "(no subject)"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {sender} | {receivedAt}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <Badge
                                variant={
                                  item.label === "urgent"
                                    ? "destructive"
                                    : "outline"
                                }
                                className="capitalize"
                              >
                                {(item.label ?? "untriaged").replace("_", " ")}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                score {item.score.toFixed(1)}
                                {typeof item.confidence === "number"
                                  ? ` | ${(item.confidence * 100).toFixed(
                                      0
                                    )}% confidence`
                                  : ""}
                              </span>
                            </div>
                          </div>

                          <div className="rounded-md border border-border bg-card px-3 py-2">
                            <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
                              {preview || "No email body available."}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setSelectedMessageId(item.id)}
                              disabled={busyId === item.id}
                            >
                              Read email
                            </Button>
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
                      );
                    })}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.section>

      <Dialog
        open={selectedMessage !== null}
        onOpenChange={(open) => !open && setSelectedMessageId(null)}
      >
        <DialogContent className="max-w-[min(100%-2rem,72rem)] gap-0 overflow-hidden p-0 sm:max-w-5xl">
          {selectedMessage ? (
            <>
              <DialogHeader className="border-b border-border bg-card px-6 py-5">
                <DialogTitle className="text-xl text-foreground">
                  {selectedMessage.subject ?? "(no subject)"}
                </DialogTitle>
                <DialogDescription className="space-y-1">
                  <span className="block">
                    {selectedMessage.senderName ??
                      selectedMessage.senderEmail ??
                      "Unknown sender"}
                  </span>
                  <span className="block">
                    {new Date(selectedMessage.receivedAt).toLocaleString()}
                  </span>
                </DialogDescription>
              </DialogHeader>

              <div className="max-h-[75vh] overflow-y-auto bg-background p-6">
                {selectedMessage.htmlBody ? (
                  <iframe
                    title={`Email from ${
                      selectedMessage.senderName ??
                      selectedMessage.senderEmail ??
                      "sender"
                    }`}
                    srcDoc={buildEmailDocument(selectedMessage.htmlBody)}
                    sandbox=""
                    className="h-[65vh] w-full rounded-lg border border-border bg-white"
                  />
                ) : (
                  <div className="rounded-lg border border-border bg-card px-5 py-4">
                    <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-7 text-foreground">
                      {selectedMessage.textBody.trim() ||
                        "No email body available."}
                    </pre>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
