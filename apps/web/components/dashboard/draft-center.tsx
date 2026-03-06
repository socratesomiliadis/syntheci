"use client";

import { useState } from "react";

import type { DraftReplyStatus } from "@syntheci/shared";

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
    <section className="panel grid">
      <div className="row">
        <h2 style={{ margin: 0 }}>Draft Center</h2>
        <span className="badge">approval required</span>
      </div>

      {status ? <p className="muted">{status}</p> : null}

      <div className="grid">
        {drafts.length === 0 ? (
          <p className="muted">No drafts yet.</p>
        ) : (
          drafts.map((draft) => (
            <article key={draft.id} className="panel" style={{ background: "#0b1220" }}>
              <div className="row">
                <strong>{draft.messageId}</strong>
                <span className="badge">{draft.status}</span>
              </div>
              <p style={{ whiteSpace: "pre-wrap" }}>{draft.body}</p>
              <div className="row" style={{ justifyContent: "flex-start" }}>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => updateDraft(draft.id, "approve")}
                  disabled={busyDraftId === draft.id || draft.status !== "generated"}
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => updateDraft(draft.id, "send")}
                  disabled={busyDraftId === draft.id || draft.status !== "approved"}
                >
                  Send now
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
