import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { contacts, connectedAccounts, db, meetingProposals } from "@syntheci/db";
import type { MeetingProposalStatus } from "@syntheci/shared";

import { decryptSecret } from "./crypto";
import { listCalendarEvents } from "./google";

export interface MeetingProposalItem {
  id: string;
  title: string;
  startsAt: string | null;
  endsAt: string | null;
  timezone: string;
  attendees: string[];
  attendeeContacts: Array<{
    id: string;
    email: string | null;
    name: string | null;
    company: string | null;
    role: string | null;
  }>;
  status: MeetingProposalStatus;
  description?: string | null;
  externalEventId?: string | null;
}

export interface MeetingCalendarItem {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  attendees: string[];
  source: "google" | "proposal";
  status?: MeetingProposalStatus;
  sourceLabel: string;
  externalUrl?: string | null;
  isAllDay: boolean;
  proposalId?: string;
}

export interface MeetingCalendarFeed {
  items: MeetingCalendarItem[];
  connectedAccountCount: number;
  accountLabels: string[];
  error: string | null;
}

function getConnectedAccountLabel(metadata: unknown, externalAccountId: string) {
  if (metadata && typeof metadata === "object") {
    const email = (metadata as Record<string, unknown>).email;
    if (typeof email === "string" && email.length > 0) {
      return email;
    }
  }

  return externalAccountId;
}

export async function getMeetingProposals(workspaceId: string) {
  const proposals = await db.query.meetingProposals.findMany({
    where: eq(meetingProposals.workspaceId, workspaceId),
    orderBy: [desc(meetingProposals.createdAt)],
    limit: 30
  });

  const attendeeEmails = [
    ...new Set(
      proposals
        .flatMap((proposal) =>
          ((proposal.attendees as string[]) ?? []).map((attendee) => attendee.trim().toLowerCase())
        )
        .filter(Boolean)
    )
  ];

  const attendeeContacts =
    attendeeEmails.length > 0
      ? await db.query.contacts.findMany({
          where: and(eq(contacts.workspaceId, workspaceId), inArray(contacts.email, attendeeEmails))
        })
      : [];

  const attendeeContactMap = new Map(
    attendeeContacts
      .filter((contact) => contact.email)
      .map((contact) => [
        contact.email!.toLowerCase(),
        {
          id: contact.id,
          email: contact.email,
          name: contact.name,
          company: contact.company,
          role: contact.role
        }
      ])
  );

  return proposals.map((proposal) => ({
    id: proposal.id,
    title: proposal.title,
    startsAt: proposal.startsAt ? proposal.startsAt.toISOString() : null,
    endsAt: proposal.endsAt ? proposal.endsAt.toISOString() : null,
    timezone: proposal.timezone,
    attendees: (proposal.attendees as string[]) ?? [],
    attendeeContacts: ((proposal.attendees as string[]) ?? [])
      .map((attendee) => attendeeContactMap.get(attendee.trim().toLowerCase()))
      .filter((contact): contact is NonNullable<typeof contact> => Boolean(contact)),
    status: proposal.status,
    description: proposal.description,
    externalEventId: proposal.externalEventId
  }));
}

export async function getMeetingProposalCounts(workspaceId: string) {
  const [proposedCount, approvedCount] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(meetingProposals)
      .where(and(eq(meetingProposals.workspaceId, workspaceId), eq(meetingProposals.status, "proposed"))),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(meetingProposals)
      .where(and(eq(meetingProposals.workspaceId, workspaceId), eq(meetingProposals.status, "approved")))
  ]);

  return {
    proposed: Number(proposedCount[0]?.count ?? 0),
    approved: Number(approvedCount[0]?.count ?? 0)
  };
}

export async function getMeetingCalendarFeed(input: {
  workspaceId: string;
  userId: string;
  rangeStart: Date;
  rangeEnd: Date;
}): Promise<MeetingCalendarFeed> {
  const [scheduledProposals, accounts] = await Promise.all([
    db.query.meetingProposals.findMany({
      where: and(
        eq(meetingProposals.workspaceId, input.workspaceId),
        sql`${meetingProposals.startsAt} is not null`,
        sql`${meetingProposals.endsAt} is not null`,
        sql`${meetingProposals.startsAt} < ${input.rangeEnd} and ${meetingProposals.endsAt} > ${input.rangeStart}`
      ),
      orderBy: [desc(meetingProposals.startsAt)]
    }),
    db.query.connectedAccounts.findMany({
      where: and(
        eq(connectedAccounts.workspaceId, input.workspaceId),
        eq(connectedAccounts.userId, input.userId),
        eq(connectedAccounts.provider, "google")
      ),
      orderBy: [desc(connectedAccounts.updatedAt)]
    })
  ]);

  const createdEventIds = new Set(
    scheduledProposals
      .filter((proposal) => proposal.status === "created" && proposal.externalEventId)
      .map((proposal) => proposal.externalEventId as string)
  );

  const proposalItems: MeetingCalendarItem[] = scheduledProposals
    .filter((proposal): proposal is typeof proposal & { startsAt: Date; endsAt: Date } => {
      return Boolean(proposal.startsAt && proposal.endsAt);
    })
    .map((proposal) => ({
      id: `proposal:${proposal.id}`,
      title: proposal.title,
      startsAt: proposal.startsAt.toISOString(),
      endsAt: proposal.endsAt.toISOString(),
      timezone: proposal.timezone,
      attendees: (proposal.attendees as string[]) ?? [],
      source: "proposal",
      status: proposal.status,
      sourceLabel:
        proposal.status === "created"
          ? "Created from Meeting Center"
          : proposal.status === "approved"
            ? "Approved proposal"
            : "Pending proposal",
      isAllDay: false,
      proposalId: proposal.id
    }));

  const settledEvents = await Promise.allSettled(
    accounts.map(async (account) => {
      const accessToken = decryptSecret(account.accessTokenCiphertext);
      const refreshToken = account.refreshTokenCiphertext
        ? decryptSecret(account.refreshTokenCiphertext)
        : null;

      const sourceLabel = getConnectedAccountLabel(account.metadata, account.externalAccountId);
      const googleEvents = await listCalendarEvents({
        accessToken,
        refreshToken,
        timeMin: input.rangeStart.toISOString(),
        timeMax: input.rangeEnd.toISOString()
      });

      const items: MeetingCalendarItem[] = [];

      for (const event of googleEvents) {
        if (!event.id || !event.start || !event.end || createdEventIds.has(event.id)) {
          continue;
        }

        const start = event.start.dateTime ?? event.start.date;
        const end = event.end.dateTime ?? event.end.date;

        if (!start || !end) {
          continue;
        }

        items.push({
          id: `google:${event.id}`,
          title: event.summary?.trim() || "(untitled event)",
          startsAt: start,
          endsAt: end,
          timezone:
            event.start.timeZone ??
            event.end.timeZone ??
            Intl.DateTimeFormat().resolvedOptions().timeZone,
          attendees:
            event.attendees
              ?.map((attendee) => attendee.email)
              .filter((email): email is string => Boolean(email)) ?? [],
          source: "google",
          sourceLabel,
          externalUrl: event.htmlLink ?? null,
          isAllDay: !event.start.dateTime
        });
      }

      return items;
    })
  );

  const googleItems = settledEvents.flatMap((result) =>
    result.status === "fulfilled" ? result.value : []
  );

  const failedCalendars = settledEvents.filter((result) => result.status === "rejected").length;

  return {
    items: [...googleItems, ...proposalItems].sort(
      (left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime()
    ),
    connectedAccountCount: accounts.length,
    accountLabels: accounts.map((account) =>
      getConnectedAccountLabel(account.metadata, account.externalAccountId)
    ),
    error:
      failedCalendars === 0
        ? null
        : failedCalendars === accounts.length
          ? "Google Calendar couldn't be loaded right now."
          : "Some connected calendars couldn't be loaded."
  };
}
