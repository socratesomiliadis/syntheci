"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Loader2, MailPlus, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";

import { TRIAGE_WEIGHT, type TriageLabel } from "@syntheci/shared";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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

interface DemoDraft {
  senderName: string;
  senderEmail: string;
  subject: string;
  body: string;
}

const EMPTY_DEMO_DRAFT: DemoDraft = {
  senderName: "",
  senderEmail: "",
  subject: "",
  body: "",
};

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

function sortInboxItems(items: InboxItem[]) {
  return [...items]
    .sort((left, right) => {
      const scoreDelta = right.score - left.score;
      if (scoreDelta !== 0) {
        return scoreDelta;
      }

      return (
        new Date(right.receivedAt).getTime() - new Date(left.receivedAt).getTime()
      );
    })
    .slice(0, 20);
}

function computeInboxScore(input: {
  label: TriageLabel | null;
  confidence: number | null;
  isUnread: boolean;
}) {
  const label = input.label ?? "informational";
  return (
    TRIAGE_WEIGHT[label] +
    (input.isUnread ? 8 : 0) +
    (input.confidence ?? 0) * 10
  );
}

export function PriorityInbox({
  initialItems,
  initialSelectedMessageId = null,
  demoMode = false,
}: {
  initialItems: InboxItem[];
  initialSelectedMessageId?: string | null;
  demoMode?: boolean;
}) {
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();
  const [items, setItems] = useState(initialItems);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(
    initialSelectedMessageId
  );
  const [demoDraft, setDemoDraft] = useState<DemoDraft>(EMPTY_DEMO_DRAFT);
  const [isCreatingDemoEmail, setIsCreatingDemoEmail] = useState(false);

  const selectedMessage =
    items.find((item) => item.id === selectedMessageId) ?? null;

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  useEffect(() => {
    if (!initialSelectedMessageId) {
      return;
    }

    if (items.some((item) => item.id === initialSelectedMessageId)) {
      setSelectedMessageId(initialSelectedMessageId);
    }
  }, [initialSelectedMessageId, items]);

  function refreshInbox() {
    startTransition(() => {
      router.refresh();
    });
  }

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
        sortInboxItems(
          prev.map((item) =>
            item.id === messageId
              ? {
                  ...item,
                  label: payload.label,
                  confidence: payload.confidence,
                  score: computeInboxScore({
                    label: payload.label,
                    confidence: payload.confidence,
                    isUnread: item.isUnread,
                  }),
                }
              : item
          )
        )
      );
      toast.success("Triage refreshed.");
      refreshInbox();
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
      refreshInbox();
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
      refreshInbox();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Meeting extraction failed"
      );
    } finally {
      setBusyId(null);
    }
  }

  async function createDemoEmail() {
    setIsCreatingDemoEmail(true);
    try {
      const response = await fetch("/api/demo/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(demoDraft),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error ?? "Could not add demo email");
      }

      const payload = (await response.json()) as {
        message: Omit<InboxItem, "receivedAt"> & { receivedAt: string };
      };

      const createdMessage: InboxItem = {
        ...payload.message,
        receivedAt: new Date(payload.message.receivedAt),
      };

      setItems((prev) => sortInboxItems([createdMessage, ...prev]));
      setSelectedMessageId(createdMessage.id);
      setDemoDraft(EMPTY_DEMO_DRAFT);
      toast.success(
        `Demo email added and triaged as ${(
          createdMessage.label ?? "informational"
        ).replace("_", " ")}.`
      );
      refreshInbox();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not add demo email"
      );
    } finally {
      setIsCreatingDemoEmail(false);
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
        <Card className="rounded-[1.6rem] border-border/80 bg-card/90 shadow-sm">
          <CardHeader className="space-y-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-lg">Priority Inbox</CardTitle>
                  <Badge variant="secondary" className="tone-info">
                    Triage + actioning
                  </Badge>
                  {demoMode ? (
                    <Badge
                      variant="outline"
                      className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                    >
                      Live demo controls
                    </Badge>
                  ) : null}
                </div>
                <CardDescription className="mt-2">
                  Ranked message queue with one-click reply, meeting extraction,
                  and triage refresh.
                </CardDescription>
              </div>
            </div>

            {demoMode ? (
              <div className="grid gap-4 rounded-[1.25rem] border border-border/80 bg-muted/55 p-4 xl:grid-cols-[1.05fr_0.95fr]">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-background/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    <Sparkles className="size-3.5 text-emerald-600" />
                    Demo mode
                  </div>
                  <p className="text-sm leading-6 text-foreground">
                    Inject a fresh email into the demo inbox and watch the real
                    triage pipeline classify it immediately.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    New emails are indexed too, so they become part of chat and
                    retrieval right away.
                  </p>
                </div>

                <div className="grid gap-3 rounded-[1.1rem] border border-border/80 bg-background/85 p-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="demo-sender-name">Sender name</Label>
                      <Input
                        id="demo-sender-name"
                        value={demoDraft.senderName}
                        placeholder="Priya Raman"
                        onChange={(event) =>
                          setDemoDraft((prev) => ({
                            ...prev,
                            senderName: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="demo-sender-email">Sender email</Label>
                      <Input
                        id="demo-sender-email"
                        type="email"
                        value={demoDraft.senderEmail}
                        placeholder="priya@catalystbank.com"
                        onChange={(event) =>
                          setDemoDraft((prev) => ({
                            ...prev,
                            senderEmail: event.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="demo-subject">Subject</Label>
                    <Input
                      id="demo-subject"
                      value={demoDraft.subject}
                      placeholder="Need the final retention answer before 17:00"
                      onChange={(event) =>
                        setDemoDraft((prev) => ({
                          ...prev,
                          subject: event.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="demo-body">Email body</Label>
                    <Textarea
                      id="demo-body"
                      rows={5}
                      value={demoDraft.body}
                      placeholder="Write the email exactly as a customer or teammate would send it."
                      onChange={(event) =>
                        setDemoDraft((prev) => ({
                          ...prev,
                          body: event.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-3">
                    <p className="text-xs text-muted-foreground">
                      Demo-only control. Uses the same inbox, triage, and
                      retrieval stack as the rest of the product.
                    </p>
                    <Button
                      type="button"
                      className="rounded-[0.95rem]"
                      onClick={createDemoEmail}
                      disabled={
                        isCreatingDemoEmail ||
                        !demoDraft.senderName.trim() ||
                        !demoDraft.senderEmail.trim() ||
                        !demoDraft.subject.trim() ||
                        !demoDraft.body.trim()
                      }
                    >
                      {isCreatingDemoEmail ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <MailPlus className="size-4" />
                          Add and triage email
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
          </CardHeader>

          <CardContent className="space-y-3">
            <AnimatePresence mode="popLayout" initial={false}>
              {items.length === 0 ? (
                <motion.p
                  key="inbox-empty"
                  layout
                  className="rounded-[1.1rem] border border-dashed border-border bg-muted px-4 py-6 text-sm text-muted-foreground"
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
                  className="grid gap-4 xl:grid-cols-2"
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
                          className="relative space-y-4 overflow-hidden rounded-[1.2rem] border border-border/80 bg-muted/55 p-4"
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

                          <div className="rounded-[1rem] border border-border/70 bg-background/80 px-3 py-3">
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

      {isRefreshing ? (
        <div className="pointer-events-none fixed bottom-5 right-5 rounded-full border border-border bg-background/90 px-3 py-2 text-xs text-muted-foreground shadow-lg backdrop-blur">
          Syncing inbox view...
        </div>
      ) : null}
    </>
  );
}
