import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { contacts, db, meetingProposals } from "@syntheci/db";

import { MeetingCenter } from "@/components/dashboard/meeting-center";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireWorkspaceContext } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function MeetingsPage() {
  const { workspaceId } = await requireWorkspaceContext();

  const [proposals, proposedCount, approvedCount] = await Promise.all([
    db.query.meetingProposals.findMany({
      where: eq(meetingProposals.workspaceId, workspaceId),
      orderBy: [desc(meetingProposals.createdAt)],
      limit: 30
    }),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(meetingProposals)
      .where(and(eq(meetingProposals.workspaceId, workspaceId), eq(meetingProposals.status, "proposed"))),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(meetingProposals)
      .where(and(eq(meetingProposals.workspaceId, workspaceId), eq(meetingProposals.status, "approved")))
  ]);

  const attendeeEmails = [
    ...new Set(
      proposals
        .flatMap((proposal) => ((proposal.attendees as string[]) ?? []).map((attendee) => attendee.trim().toLowerCase()))
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

  return (
    <main className="space-y-6 px-4 py-5 md:px-6 md:py-6">
      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="rounded-[1.75rem] border-slate-200/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.95),rgba(236,253,245,0.94))] shadow-sm">
          <CardHeader>
            <CardTitle className="text-3xl tracking-tight text-slate-950">Turn scheduling intent into reviewed calendar actions</CardTitle>
          </CardHeader>
          <CardContent className="max-w-2xl text-sm leading-6 text-slate-600">
            Extracted meetings stay in proposal mode until someone confirms timing and creates the event.
          </CardContent>
        </Card>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <Card className="rounded-[1.4rem] border-slate-200/80 bg-white/90 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-700">Awaiting review</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-semibold tracking-tight text-slate-950">
                {Number(proposedCount[0]?.count ?? 0)}
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-[1.4rem] border-slate-200/80 bg-white/90 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-700">Approved to create</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-semibold tracking-tight text-slate-950">
                {Number(approvedCount[0]?.count ?? 0)}
              </p>
            </CardContent>
          </Card>
        </section>
      </section>

      <MeetingCenter
        initialProposals={proposals.map((proposal) => ({
          id: proposal.id,
          title: proposal.title,
          startsAt: proposal.startsAt ? proposal.startsAt.toISOString() : null,
          endsAt: proposal.endsAt ? proposal.endsAt.toISOString() : null,
          timezone: proposal.timezone,
          attendees: (proposal.attendees as string[]) ?? [],
          attendeeContacts: ((proposal.attendees as string[]) ?? [])
            .map((attendee) => attendeeContactMap.get(attendee.trim().toLowerCase()))
            .filter((contact): contact is NonNullable<typeof contact> => Boolean(contact)),
          status: proposal.status
        }))}
      />
    </main>
  );
}
