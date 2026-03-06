"use client";

import { useState } from "react";

import type { MeetingProposalStatus } from "@syntheci/shared";

interface MeetingProposalItem {
  id: string;
  title: string;
  startsAt: string | null;
  endsAt: string | null;
  timezone: string;
  attendees: string[];
  status: MeetingProposalStatus;
}

export function MeetingCenter({ initialProposals }: { initialProposals: MeetingProposalItem[] }) {
  const [proposals, setProposals] = useState(initialProposals);
  const [busyProposalId, setBusyProposalId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function updateProposal(proposalId: string, action: "approve" | "create") {
    setBusyProposalId(proposalId);
    setStatus(null);
    try {
      const response = await fetch(`/api/meetings/proposals/${proposalId}/${action}`, {
        method: "POST"
      });
      if (!response.ok) throw new Error(`${action} failed`);
      const payload = (await response.json()) as { status: MeetingProposalStatus };
      setProposals((prev) =>
        prev.map((proposal) =>
          proposal.id === proposalId ? { ...proposal, status: payload.status } : proposal
        )
      );
      setStatus(`Proposal ${action}d successfully.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : `${action} failed`);
    } finally {
      setBusyProposalId(null);
    }
  }

  return (
    <section className="panel grid">
      <div className="row">
        <h2 style={{ margin: 0 }}>Meeting Center</h2>
        <span className="badge">proposal before creation</span>
      </div>

      {status ? <p className="muted">{status}</p> : null}

      <div className="grid">
        {proposals.length === 0 ? (
          <p className="muted">No meeting proposals yet.</p>
        ) : (
          proposals.map((proposal) => (
            <article key={proposal.id} className="panel" style={{ background: "#0b1220" }}>
              <div className="row">
                <strong>{proposal.title}</strong>
                <span className="badge">{proposal.status}</span>
              </div>
              <p className="muted" style={{ marginBottom: 0 }}>
                {proposal.startsAt ?? "TBD"} - {proposal.endsAt ?? "TBD"} ({proposal.timezone})
              </p>
              <p className="muted" style={{ marginTop: "0.3rem" }}>
                Attendees: {proposal.attendees.join(", ") || "(none)"}
              </p>
              <div className="row" style={{ justifyContent: "flex-start" }}>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => updateProposal(proposal.id, "approve")}
                  disabled={busyProposalId === proposal.id || proposal.status !== "proposed"}
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => updateProposal(proposal.id, "create")}
                  disabled={busyProposalId === proposal.id || proposal.status !== "approved"}
                >
                  Create event
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
