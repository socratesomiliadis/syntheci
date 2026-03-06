"use client";

import { useState } from "react";

import type { MeetingProposalStatus } from "@syntheci/shared";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
  const [statusTone, setStatusTone] = useState<"success" | "error">("success");

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
      setStatusTone("success");
      setStatus(`Proposal ${action}d successfully.`);
    } catch (error) {
      setStatusTone("error");
      setStatus(error instanceof Error ? error.message : `${action} failed`);
    } finally {
      setBusyProposalId(null);
    }
  }

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-lg">Meeting Center</CardTitle>
          <Badge variant="secondary" className="border border-blue-200 bg-blue-50 text-blue-700">
            Proposal workflow
          </Badge>
        </div>
        <CardDescription>Approve extracted meeting intents before calendar creation.</CardDescription>
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

        {proposals.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-6 text-sm text-slate-500">
            No meeting proposals yet.
          </p>
        ) : (
          proposals.map((proposal) => (
            <article
              key={proposal.id}
              className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-slate-800">{proposal.title}</p>
                <Badge variant="outline" className="capitalize">
                  {proposal.status}
                </Badge>
              </div>
              <p className="rounded-md bg-white px-3 py-2 text-xs text-slate-600">
                {proposal.startsAt ?? "TBD"} - {proposal.endsAt ?? "TBD"} ({proposal.timezone})
              </p>
              <p className="rounded-md bg-white px-3 py-2 text-xs text-slate-600">
                Attendees: {proposal.attendees.join(", ") || "(none)"}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => updateProposal(proposal.id, "approve")}
                  disabled={busyProposalId === proposal.id || proposal.status !== "proposed"}
                >
                  Approve
                </Button>
                <Button
                  type="button"
                  onClick={() => updateProposal(proposal.id, "create")}
                  disabled={busyProposalId === proposal.id || proposal.status !== "approved"}
                >
                  Create event
                </Button>
              </div>
            </article>
          ))
        )}
      </CardContent>
    </Card>
  );
}
