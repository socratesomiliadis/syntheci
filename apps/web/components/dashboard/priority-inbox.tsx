"use client";

import { useState } from "react";

import type { TriageLabel } from "@syntheci/shared";

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
    <Card id="inbox" className="border-slate-200 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-lg">Priority Inbox</CardTitle>
          <Badge variant="secondary" className="border border-blue-200 bg-blue-50 text-blue-700">
            Triage + actioning
          </Badge>
        </div>
        <CardDescription>Ranked message queue with one-click reply and scheduling actions.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {status ? (
          <p
            className={
              statusTone === "error"
                ? "rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                : "rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
            }
          >
            {status}
          </p>
        ) : null}

        {items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-6 text-sm text-slate-500">
            No messages yet.
          </p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <article key={item.id} className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-800">{item.subject ?? "(no subject)"}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.senderName ?? item.senderEmail ?? "Unknown sender"} •{" "}
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
                    <span className="text-xs text-slate-500">
                      score {item.score.toFixed(1)}
                      {typeof item.confidence === "number"
                        ? ` • ${(item.confidence * 100).toFixed(0)}% confidence`
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
              </article>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
