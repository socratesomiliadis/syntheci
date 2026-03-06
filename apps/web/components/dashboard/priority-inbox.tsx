"use client";

import { useState } from "react";

import type { TriageLabel } from "@syntheci/shared";

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
      setStatus("Triage refreshed.");
    } catch (error) {
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
      setStatus("Draft generated. Open draft center to approve/send.");
    } catch (error) {
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
      setStatus("Meeting proposal generated.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Meeting extraction failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="panel grid">
      <div className="row">
        <h2 style={{ margin: 0 }}>Priority Inbox</h2>
        <span className="badge">triage + actioning</span>
      </div>
      {status ? <p className="muted">{status}</p> : null}
      <div className="grid">
        {items.length === 0 ? (
          <p className="muted">No messages yet.</p>
        ) : (
          items.map((item) => (
            <article key={item.id} className="panel" style={{ background: "#0b1220" }}>
              <div className="row">
                <div>
                  <strong>{item.subject ?? "(no subject)"}</strong>
                  <p className="muted" style={{ margin: "0.2rem 0 0" }}>
                    {item.senderName ?? item.senderEmail ?? "Unknown sender"} •{" "}
                    {new Date(item.receivedAt).toLocaleString()}
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="badge">{item.label ?? "untriaged"}</div>
                  <p className="muted" style={{ margin: "0.25rem 0 0" }}>
                    score {item.score.toFixed(1)}
                  </p>
                </div>
              </div>
              <div className="row" style={{ justifyContent: "flex-start", marginTop: "0.8rem" }}>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => triageMessage(item.id)}
                  disabled={busyId === item.id}
                >
                  Re-triage
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => generateDraft(item.id)}
                  disabled={busyId === item.id}
                >
                  Draft reply
                </button>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => proposeMeeting(item.id)}
                  disabled={busyId === item.id}
                >
                  Extract meeting
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
