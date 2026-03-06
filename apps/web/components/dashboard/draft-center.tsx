"use client";

import { useState } from "react";

import type { DraftReplyStatus } from "@syntheci/shared";

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
      setStatus(`Draft ${action}d successfully.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : `${action} failed`);
    } finally {
      setBusyDraftId(null);
    }
  }

  return (
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
        {status ? (
          <p className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
            {status}
          </p>
        ) : null}

        {drafts.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-6 text-sm text-slate-500">
            No drafts yet.
          </p>
        ) : (
          drafts.map((draft) => (
            <article key={draft.id} className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
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

              <p className="whitespace-pre-wrap text-sm text-slate-700">{draft.body}</p>

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
            </article>
          ))
        )}
      </CardContent>
    </Card>
  );
}
