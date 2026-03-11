"use client";

import { useState } from "react";

import { CalendarClock, Loader2, PencilLine } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const [editingProposalId, setEditingProposalId] = useState<string | null>(null);
  const [editStartsAt, setEditStartsAt] = useState("");
  const [editEndsAt, setEditEndsAt] = useState("");

  function isSchedulable(proposal: MeetingProposalItem) {
    return Boolean(proposal.startsAt && proposal.endsAt);
  }

  function toDateTimeLocalValue(value: string | null) {
    if (!value) return "";

    const date = new Date(value);
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    const hours = `${date.getHours()}`.padStart(2, "0");
    const minutes = `${date.getMinutes()}`.padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  function openEditor(proposal: MeetingProposalItem) {
    setEditingProposalId(proposal.id);
    setEditStartsAt(toDateTimeLocalValue(proposal.startsAt));
    setEditEndsAt(toDateTimeLocalValue(proposal.endsAt));
    setStatus(null);
  }

  function closeEditor() {
    setEditingProposalId(null);
    setEditStartsAt("");
    setEditEndsAt("");
  }

  async function saveProposalTiming(proposal: MeetingProposalItem) {
    if (!editStartsAt || !editEndsAt) {
      setStatusTone("error");
      setStatus("Start and end time are required.");
      return;
    }

    setBusyProposalId(proposal.id);
    setStatus(null);

    try {
      const response = await fetch(`/api/meetings/proposals/${proposal.id}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          startsAt: new Date(editStartsAt).toISOString(),
          endsAt: new Date(editEndsAt).toISOString()
        })
      });
      const payload = (await response.json()) as {
        status?: MeetingProposalStatus;
        startsAt?: string | null;
        endsAt?: string | null;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "timing update failed");
      }

      setProposals((prev) =>
        prev.map((current) =>
          current.id === proposal.id
            ? {
                ...current,
                status: payload.status ?? current.status,
                startsAt: payload.startsAt ?? current.startsAt,
                endsAt: payload.endsAt ?? current.endsAt
              }
            : current
        )
      );
      setStatusTone("success");
      setStatus("Proposal timing updated.");
      closeEditor();
    } catch (error) {
      setStatusTone("error");
      setStatus(error instanceof Error ? error.message : "timing update failed");
    } finally {
      setBusyProposalId(null);
    }
  }

  async function updateProposal(proposalId: string, action: "approve" | "create") {
    setBusyProposalId(proposalId);
    setStatus(null);
    try {
      const response = await fetch(`/api/meetings/proposals/${proposalId}/${action}`, {
        method: "POST"
      });
      const payload = (await response.json()) as { status?: MeetingProposalStatus; error?: string };
      if (!response.ok) throw new Error(payload.error ?? `${action} failed`);
      setProposals((prev) =>
        prev.map((proposal) =>
          proposal.id === proposalId && payload.status
            ? { ...proposal, status: payload.status }
            : proposal
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
                      {!isSchedulable(proposal) ? (
                        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                          Missing start/end time. Extract from a message with explicit timing before approval or calendar creation.
                        </p>
                      ) : null}
                      <p className="rounded-md bg-white px-3 py-2 text-xs text-slate-600">
                        Attendees: {proposal.attendees.join(", ") || "(none)"}
                      </p>
                      <AnimatePresence initial={false}>
                        {editingProposalId === proposal.id ? (
                          <motion.div
                            key={`${proposal.id}-editor`}
                            className="space-y-3 rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-[0_12px_30px_rgba(15,23,42,0.08)]"
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.18, ease: "easeOut" }}
                          >
                            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                              <CalendarClock className="size-3.5 text-blue-600" />
                              Timing Editor
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div className="space-y-1.5">
                                <Label htmlFor={`${proposal.id}-starts-at`} className="text-xs text-slate-600">
                                  Start
                                </Label>
                                <Input
                                  id={`${proposal.id}-starts-at`}
                                  type="datetime-local"
                                  value={editStartsAt}
                                  onChange={(event) => setEditStartsAt(event.target.value)}
                                  className="h-9 border-slate-200 bg-slate-50 text-sm"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label htmlFor={`${proposal.id}-ends-at`} className="text-xs text-slate-600">
                                  End
                                </Label>
                                <Input
                                  id={`${proposal.id}-ends-at`}
                                  type="datetime-local"
                                  value={editEndsAt}
                                  onChange={(event) => setEditEndsAt(event.target.value)}
                                  className="h-9 border-slate-200 bg-slate-50 text-sm"
                                />
                              </div>
                            </div>
                            <p className="text-[11px] text-slate-500">
                              Saved using your current browser timezone. Current meeting timezone: {proposal.timezone}.
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => saveProposalTiming(proposal)}
                                disabled={busyProposalId === proposal.id}
                              >
                                Save time
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={closeEditor}
                                disabled={busyProposalId === proposal.id}
                              >
                                Cancel
                              </Button>
                            </div>
                          </motion.div>
                        ) : null}
                      </AnimatePresence>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => openEditor(proposal)}
                          disabled={busyProposalId === proposal.id || proposal.status === "created"}
                        >
                          <PencilLine className="mr-1 size-3.5" />
                          Edit time
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => updateProposal(proposal.id, "approve")}
                          disabled={
                            busyProposalId === proposal.id ||
                            proposal.status !== "proposed" ||
                            !isSchedulable(proposal)
                          }
                        >
                          Approve
                        </Button>
                        <Button
                          type="button"
                          onClick={() => updateProposal(proposal.id, "create")}
                          disabled={
                            busyProposalId === proposal.id ||
                            proposal.status !== "approved" ||
                            !isSchedulable(proposal)
                          }
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
