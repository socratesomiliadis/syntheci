"use client";

import { startTransition, useRef, useState } from "react";

import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  ExternalLink,
  Link2,
  Loader2,
  PencilLine,
  RefreshCw
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import type { MeetingProposalStatus } from "@syntheci/shared";

import {
  listItemReveal,
  overlayReveal,
  overlayTransition,
  panelReveal,
  panelTransition,
  statusReveal,
  statusTransition,
  withStagger
} from "@/components/dashboard/motion-presets";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addDays,
  addMonths,
  getDateKey,
  getMonthKey,
  parseDateKey,
  parseMonthKey,
  startOfMonthGrid
} from "@/lib/calendar";
import type { MeetingCalendarFeed, MeetingCalendarItem, MeetingProposalItem } from "@/lib/meetings";
import { cn } from "@/lib/utils";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function isSchedulable(proposal: MeetingProposalItem) {
  return Boolean(proposal.startsAt && proposal.endsAt);
}

function parseCalendarValue(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return parseDateKey(value);
  }

  return new Date(value);
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

function buildItemsByDay(items: MeetingCalendarItem[]) {
  const bucket = new Map<string, MeetingCalendarItem[]>();

  for (const item of items) {
    const start = parseCalendarValue(item.startsAt);
    const end = parseCalendarValue(item.endsAt);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      continue;
    }

    const firstDay = parseDateKey(getDateKey(start));
    const lastMoment = end.getTime() <= start.getTime() ? start : new Date(end.getTime() - 1);
    const lastDay = parseDateKey(getDateKey(lastMoment));

    for (
      let cursor = firstDay;
      cursor.getTime() <= lastDay.getTime();
      cursor = addDays(cursor, 1)
    ) {
      const key = getDateKey(cursor);
      const existing = bucket.get(key) ?? [];
      existing.push(item);
      bucket.set(key, existing);
    }
  }

  for (const [key, value] of bucket.entries()) {
    bucket.set(
      key,
      value.toSorted(
        (left, right) =>
          parseCalendarValue(left.startsAt).getTime() - parseCalendarValue(right.startsAt).getTime()
      )
    );
  }

  return bucket;
}

function getCalendarItemTone(item: MeetingCalendarItem) {
  if (item.source === "google") {
    return "tone-info";
  }

  if (item.status === "approved") {
    return "tone-success";
  }

  if (item.status === "created") {
    return "border-border bg-accent text-foreground";
  }

  return "tone-warning";
}

function formatCalendarItemTime(item: MeetingCalendarItem) {
  if (item.isAllDay) {
    return "All day";
  }

  const start = parseCalendarValue(item.startsAt);
  const end = parseCalendarValue(item.endsAt);

  return `${start.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  })} - ${end.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  })}`;
}

function getProposalBadgeTone(status: MeetingProposalStatus) {
  if (status === "approved") {
    return "tone-success";
  }

  if (status === "created") {
    return "border border-border bg-accent text-foreground";
  }

  return "tone-warning";
}

function createInitialSelectedDate(monthKey: string) {
  const today = new Date();
  const todayMonth = getMonthKey(today);

  if (todayMonth === monthKey) {
    return getDateKey(today);
  }

  return `${monthKey}-01`;
}

export function MeetingCenter({
  initialMonth,
  initialProposals,
  initialCalendarFeed
}: {
  initialMonth: string;
  initialProposals: MeetingProposalItem[];
  initialCalendarFeed: MeetingCalendarFeed;
}) {
  const [proposals, setProposals] = useState(initialProposals);
  const [calendarFeed, setCalendarFeed] = useState(initialCalendarFeed);
  const [monthKey, setMonthKey] = useState(initialMonth);
  const [selectedDateKey, setSelectedDateKey] = useState(createInitialSelectedDate(initialMonth));
  const [busyProposalId, setBusyProposalId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<"success" | "error">("success");
  const [calendarStatus, setCalendarStatus] = useState<string | null>(initialCalendarFeed.error);
  const [editingProposalId, setEditingProposalId] = useState<string | null>(null);
  const [editStartsAt, setEditStartsAt] = useState("");
  const [editEndsAt, setEditEndsAt] = useState("");
  const [isCalendarLoading, setIsCalendarLoading] = useState(false);
  const calendarRequestRef = useRef(0);

  const monthDate = parseMonthKey(monthKey);
  const monthLabel = monthDate.toLocaleDateString([], {
    month: "long",
    year: "numeric"
  });
  const gridStart = startOfMonthGrid(monthDate);
  const gridDays = Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
  const itemsByDay = buildItemsByDay(calendarFeed.items);
  const selectedDay = parseDateKey(selectedDateKey);
  const selectedDayItems = itemsByDay.get(selectedDateKey) ?? [];
  const visibleSelectedDayItems = selectedDayItems.toSorted(
    (left, right) =>
      parseCalendarValue(left.startsAt).getTime() - parseCalendarValue(right.startsAt).getTime()
  );

  async function refreshCalendar(targetMonthKey = monthKey) {
    const requestId = calendarRequestRef.current + 1;
    calendarRequestRef.current = requestId;
    setIsCalendarLoading(true);
    setCalendarStatus(null);

    try {
      const response = await fetch(`/api/meetings/calendar?month=${targetMonthKey}`, {
        method: "GET",
        cache: "no-store"
      });
      const payload = (await response.json()) as MeetingCalendarFeed & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Calendar refresh failed.");
      }

      if (calendarRequestRef.current !== requestId) {
        return;
      }

      startTransition(() => {
        setCalendarFeed(payload);
        setCalendarStatus(payload.error);
      });
    } catch (error) {
      if (calendarRequestRef.current === requestId) {
        setCalendarStatus(error instanceof Error ? error.message : "Calendar refresh failed.");
      }
    } finally {
      if (calendarRequestRef.current === requestId) {
        setIsCalendarLoading(false);
      }
    }
  }

  function changeMonth(offset: number) {
    const nextMonth = getMonthKey(addMonths(monthDate, offset));
    setMonthKey(nextMonth);
    setSelectedDateKey(`${nextMonth}-01`);
    void refreshCalendar(nextMonth);
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
      void refreshCalendar();
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
      const payload = (await response.json()) as {
        status?: MeetingProposalStatus;
        externalEventId?: string | null;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? `${action} failed`);
      }

      setProposals((prev) =>
        prev.map((proposal) =>
          proposal.id === proposalId
            ? {
                ...proposal,
                status: payload.status ?? proposal.status,
                externalEventId: payload.externalEventId ?? proposal.externalEventId
              }
            : proposal
        )
      );
      setStatusTone("success");
      setStatus(`Proposal ${action}d successfully.`);
      void refreshCalendar();
    } catch (error) {
      setStatusTone("error");
      setStatus(error instanceof Error ? error.message : `${action} failed`);
    } finally {
      setBusyProposalId(null);
    }
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.85fr)]">
      <motion.section initial="initial" animate="animate" variants={panelReveal} transition={panelTransition}>
        <Card className="overflow-hidden border-border/80 bg-card shadow-sm">
          <CardHeader className="gap-5 border-b border-border/80 bg-card">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="tone-info">
                    Live calendar
                  </Badge>
                  <Badge variant="outline" className="border-border bg-card/80 text-foreground">
                    {calendarFeed.connectedAccountCount > 0
                      ? `${calendarFeed.connectedAccountCount} connected calendar${calendarFeed.connectedAccountCount === 1 ? "" : "s"}`
                      : "No connected calendar"}
                  </Badge>
                </div>
                <div>
                  <CardTitle className="text-2xl tracking-tight text-foreground md:text-[2rem]">
                    {monthLabel}
                  </CardTitle>
                  <CardDescription className="mt-2 max-w-2xl text-sm text-muted-foreground">
                    A shared month view for imported Google Calendar events and Meeting Center proposals.
                  </CardDescription>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => void refreshCalendar()} disabled={isCalendarLoading}>
                  {isCalendarLoading ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 size-4" />
                  )}
                  Refresh
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => changeMonth(-1)} disabled={isCalendarLoading}>
                  <ArrowLeft className="size-4" />
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => changeMonth(1)} disabled={isCalendarLoading}>
                  <ArrowRight className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const today = new Date();
                    const todayMonthKey = getMonthKey(today);
                    setMonthKey(todayMonthKey);
                    setSelectedDateKey(getDateKey(today));
                    void refreshCalendar(todayMonthKey);
                  }}
                  disabled={isCalendarLoading}
                >
                  Today
                </Button>
              </div>
            </div>

            {calendarFeed.accountLabels.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {calendarFeed.accountLabels.map((label) => (
                  <span
                    key={label}
                    className="rounded-full border border-border bg-card/90 px-3 py-1 text-xs text-muted-foreground"
                  >
                    {label}
                  </span>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-border bg-card/80 px-4 py-3 text-sm text-muted-foreground">
                <span>Connect Google Calendar to pull in the user&apos;s real events.</span>
                <a
                  href="/api/connect/google/start"
                  className={cn(buttonVariants({ variant: "default", size: "sm" }), "rounded-xl")}
                >
                  <Link2 className="mr-2 size-4" />
                  Connect Google Calendar
                </a>
              </div>
            )}
          </CardHeader>

          <CardContent className="relative p-0">
            <AnimatePresence mode="popLayout" initial={false}>
              {calendarStatus ? (
                <motion.p
                  key={`calendar-status-${calendarStatus}`}
                  className="mx-6 mt-6 rounded-xl tone-warning px-4 py-3 text-sm"
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  variants={statusReveal}
                  transition={statusTransition}
                >
                  {calendarStatus}
                </motion.p>
              ) : null}
            </AnimatePresence>

            <div className="grid grid-cols-7 border-t border-border/80 bg-muted/70">
              {WEEKDAY_LABELS.map((weekday) => (
                <div
                  key={weekday}
                  className="border-b border-r border-border/80 px-3 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground last:border-r-0"
                >
                  {weekday}
                </div>
              ))}
              {gridDays.map((day) => {
                const dayKey = getDateKey(day);
                const dayItems = itemsByDay.get(dayKey) ?? [];
                const isCurrentMonth = day.getMonth() === monthDate.getMonth();
                const isSelected = dayKey === selectedDateKey;
                const isToday = dayKey === getDateKey(new Date());

                return (
                  <button
                    key={dayKey}
                    type="button"
                    onClick={() => setSelectedDateKey(dayKey)}
                    className={cn(
                      "relative min-h-36 border-r border-b border-border/80 px-3 py-3 text-left transition-colors last:border-r-0 sm:min-h-40",
                      isCurrentMonth ? "bg-card" : "bg-muted/80",
                      isSelected && "bg-primary/10",
                      !isSelected && isCurrentMonth && "hover:bg-muted",
                      !isSelected && !isCurrentMonth && "hover:bg-accent/80"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          "inline-flex size-8 items-center justify-center rounded-full text-sm font-semibold",
                          isToday
                            ? "bg-foreground text-background"
                            : isSelected
                              ? "bg-primary/15 text-primary"
                              : "text-foreground",
                          !isCurrentMonth && "text-muted-foreground"
                        )}
                      >
                        {day.getDate()}
                      </span>
                      {dayItems.length > 0 ? (
                        <span className="text-[11px] font-medium text-muted-foreground">{dayItems.length}</span>
                      ) : null}
                    </div>

                    <div className="mt-3 space-y-1.5">
                      {dayItems.slice(0, 3).map((item) => (
                        <div
                          key={`${dayKey}-${item.id}`}
                          className={cn(
                            "rounded-lg border px-2 py-1.5 text-left text-[11px] leading-4 shadow-[0_4px_18px_rgba(15,23,42,0.05)]",
                            getCalendarItemTone(item)
                          )}
                        >
                          <p className="truncate font-semibold">{item.title}</p>
                          <p className="truncate opacity-80">{formatCalendarItemTime(item)}</p>
                        </div>
                      ))}
                      {dayItems.length > 3 ? (
                        <p className="px-1 text-[11px] font-medium text-muted-foreground">
                          +{dayItems.length - 3} more
                        </p>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>

            <AnimatePresence mode="popLayout" initial={false}>
              {isCalendarLoading ? (
                <motion.div
                  key={`calendar-loading-${monthKey}`}
                  className="pointer-events-none absolute inset-0 flex items-center justify-center bg-card/70 backdrop-blur-[2px]"
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  variants={overlayReveal}
                  transition={overlayTransition}
                >
                  <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm">
                    <Loader2 className="size-3.5 animate-spin text-blue-600" />
                    Loading month view...
                  </span>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.section>

      <div className="space-y-6">
        <motion.section initial="initial" animate="animate" variants={panelReveal} transition={panelTransition}>
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-lg text-foreground">
                    {selectedDay.toLocaleDateString([], {
                      weekday: "long",
                      month: "long",
                      day: "numeric"
                    })}
                  </CardTitle>
                  <CardDescription>Agenda pulled from connected calendars and Meeting Center.</CardDescription>
                </div>
                <Badge variant="outline" className="border-border bg-card text-foreground">
                  {visibleSelectedDayItems.length} item{visibleSelectedDayItems.length === 1 ? "" : "s"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {visibleSelectedDayItems.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border bg-muted px-4 py-6 text-sm text-muted-foreground">
                  No events on this day yet.
                </p>
              ) : (
                visibleSelectedDayItems.map((item) => (
                  <article
                    key={`agenda-${selectedDateKey}-${item.id}`}
                    className="rounded-[1.1rem] border border-border/80 bg-card px-4 py-4 shadow-[0_10px_26px_rgba(15,23,42,0.05)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              "rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                              getCalendarItemTone(item)
                            )}
                          >
                            {item.sourceLabel}
                          </span>
                          <span className="text-xs text-muted-foreground">{formatCalendarItemTime(item)}</span>
                        </div>
                        <p className="text-sm font-semibold text-foreground">{item.title}</p>
                        {item.attendees.length > 0 ? (
                          <p className="text-xs text-muted-foreground">
                            Attendees: {item.attendees.join(", ")}
                          </p>
                        ) : null}
                      </div>
                      {item.externalUrl ? (
                        <a
                          href={item.externalUrl}
                          target="_blank"
                          rel="noreferrer"
                          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-xl")}
                        >
                          <ExternalLink className="mr-2 size-4" />
                          Open
                        </a>
                      ) : null}
                    </div>
                  </article>
                ))
              )}
            </CardContent>
          </Card>
        </motion.section>

        <motion.section initial="initial" animate="animate" variants={panelReveal} transition={panelTransition}>
          <Card className="border-border shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-lg">Proposal workflow</CardTitle>
                <Badge variant="secondary" className="tone-info">
                  Meeting Center
                </Badge>
              </div>
              <CardDescription>Approve extracted meeting intents and create the event when timing is right.</CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
              <AnimatePresence mode="popLayout" initial={false}>
                {status ? (
                  <motion.p
                    key={`meeting-status-${statusTone}-${status}`}
                    layout
                    className={
                      statusTone === "error"
                        ? "rounded-lg tone-danger px-3 py-2 text-sm"
                        : "rounded-lg tone-success px-3 py-2 text-sm"
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
                    className="rounded-lg border border-dashed border-border bg-muted px-3 py-6 text-sm text-muted-foreground"
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
                          className="relative space-y-3 overflow-hidden rounded-[1.2rem] border border-border bg-muted/70 p-4"
                          initial="initial"
                          animate="animate"
                          exit="exit"
                          variants={listItemReveal}
                          transition={withStagger(index)}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-medium text-foreground">{proposal.title}</p>
                              {proposal.description ? (
                                <p className="mt-1 text-xs text-muted-foreground">{proposal.description}</p>
                              ) : null}
                            </div>
                            <span
                              className={cn(
                                "rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize",
                                getProposalBadgeTone(proposal.status)
                              )}
                            >
                              {proposal.status}
                            </span>
                          </div>
                          <p className="rounded-md bg-card px-3 py-2 text-xs text-muted-foreground">
                            {proposal.startsAt ?? "TBD"} - {proposal.endsAt ?? "TBD"} ({proposal.timezone})
                          </p>

                          {!isSchedulable(proposal) ? (
                            <p className="rounded-md tone-warning px-3 py-2 text-xs">
                              Missing start/end time. Extract or confirm timing before approval or event creation.
                            </p>
                          ) : null}

                          <p className="rounded-md bg-card px-3 py-2 text-xs text-muted-foreground">
                            Attendees: {proposal.attendees.join(", ") || "(none)"}
                          </p>

                          {proposal.attendeeContacts.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {proposal.attendeeContacts.map((contact) => (
                                <span
                                  key={`${proposal.id}-${contact.id}`}
                                  className="rounded-full tone-info px-2.5 py-1 text-[11px]"
                                >
                                  {contact.name ?? contact.email}
                                  {contact.company ? ` - ${contact.company}` : ""}
                                </span>
                              ))}
                            </div>
                          ) : null}

                          <AnimatePresence initial={false}>
                            {editingProposalId === proposal.id ? (
                              <motion.div
                                key={`${proposal.id}-editor`}
                                className="space-y-3 rounded-xl border border-border bg-card px-3 py-3 shadow-[0_12px_30px_rgba(15,23,42,0.08)]"
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                transition={{ duration: 0.18, ease: "easeOut" }}
                              >
                                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                                  <CalendarClock className="size-3.5 text-blue-600" />
                                  Timing Editor
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <div className="space-y-1.5">
                                    <Label htmlFor={`${proposal.id}-starts-at`} className="text-xs text-muted-foreground">
                                      Start
                                    </Label>
                                    <Input
                                      id={`${proposal.id}-starts-at`}
                                      type="datetime-local"
                                      value={editStartsAt}
                                      onChange={(event) => setEditStartsAt(event.target.value)}
                                      className="h-9 border-border bg-muted text-sm"
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label htmlFor={`${proposal.id}-ends-at`} className="text-xs text-muted-foreground">
                                      End
                                    </Label>
                                    <Input
                                      id={`${proposal.id}-ends-at`}
                                      type="datetime-local"
                                      value={editEndsAt}
                                      onChange={(event) => setEditEndsAt(event.target.value)}
                                      className="h-9 border-border bg-muted text-sm"
                                    />
                                  </div>
                                </div>
                                <p className="text-[11px] text-muted-foreground">
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
                                className="pointer-events-none absolute inset-0 flex items-center justify-center bg-card/65 backdrop-blur-[2px]"
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                variants={overlayReveal}
                                transition={overlayTransition}
                              >
                                <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm">
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
      </div>
    </section>
  );
}
