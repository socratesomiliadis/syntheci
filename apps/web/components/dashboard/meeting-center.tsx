"use client";

import { useState } from "react";

import { Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import type { MeetingProposalStatus } from "@syntheci/shared";

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
    <motion.section initial="initial" animate="animate" variants={panelReveal} transition={panelTransition}>
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
          <AnimatePresence mode="popLayout" initial={false}>
            {status ? (
              <motion.p
                key={`meeting-status-${statusTone}-${status}`}
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
            {proposals.length === 0 ? (
              <motion.p
                key="meeting-empty"
                layout
                className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-6 text-sm text-slate-500"
                initial="initial"
                animate="animate"
                exit="exit"
                variants={statusReveal}
                transition={statusTransition}
              >
                No meeting proposals yet.
              </motion.p>
            ) : (
              <motion.div key="meeting-list" layout className="space-y-3">
                <AnimatePresence mode="popLayout" initial={false}>
                  {proposals.map((proposal, index) => (
                    <motion.article
                      key={proposal.id}
                      layout
                      className="relative space-y-3 overflow-hidden rounded-lg border border-slate-200 bg-slate-50/70 p-3"
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      variants={listItemReveal}
                      transition={withStagger(index)}
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

                      <AnimatePresence mode="popLayout" initial={false}>
                        {busyProposalId === proposal.id ? (
                          <motion.div
                            key={`${proposal.id}-busy`}
                            className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/65 backdrop-blur-[2px]"
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            variants={overlayReveal}
                            transition={overlayTransition}
                          >
                            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm">
                              <Loader2 className="size-3.5 animate-spin text-blue-600" />
                              Updating proposal...
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
