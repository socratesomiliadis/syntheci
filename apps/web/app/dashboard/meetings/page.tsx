import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMonthGridBounds, getMonthKey } from "@/lib/calendar";
import {
  getMeetingCalendarFeed,
  getMeetingProposalCounts,
  getMeetingProposals
} from "@/lib/meetings";
import { requireWorkspaceContext } from "@/lib/session";
import { MeetingCenter } from "@/components/dashboard/meeting-center";

export const dynamic = "force-dynamic";

export default async function MeetingsPage() {
  const { session, workspaceId } = await requireWorkspaceContext();
  const initialMonth = getMonthKey(new Date());
  const { start, end } = getMonthGridBounds(new Date());

  const [proposals, counts, calendarFeed] = await Promise.all([
    getMeetingProposals(workspaceId),
    getMeetingProposalCounts(workspaceId),
    getMeetingCalendarFeed({
      workspaceId,
      userId: session.user.id,
      rangeStart: start,
      rangeEnd: end
    })
  ]);

  return (
    <main className="space-y-6 px-4 py-5 md:px-6 md:py-6">
      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="rounded-[1.75rem] border-border/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.97),rgba(239,246,255,0.95))] shadow-sm">
          <CardHeader>
            <CardTitle className="text-3xl tracking-tight text-foreground">
              See your real calendar, then turn extracted scheduling intent into confirmed events.
            </CardTitle>
          </CardHeader>
          <CardContent className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Google Calendar events and Meeting Center proposals now share one month view so people can
            schedule with context instead of guessing around conflicts.
          </CardContent>
        </Card>

        <section className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
          <Card className="rounded-[1.4rem] border-border/80 bg-card/90 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-foreground">Awaiting review</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-semibold tracking-tight text-foreground">{counts.proposed}</p>
            </CardContent>
          </Card>
          <Card className="rounded-[1.4rem] border-border/80 bg-card/90 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-foreground">Approved to create</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-semibold tracking-tight text-foreground">{counts.approved}</p>
            </CardContent>
          </Card>
          <Card className="rounded-[1.4rem] border-border/80 bg-card/90 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-foreground">Connected calendars</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-semibold tracking-tight text-foreground">
                {calendarFeed.connectedAccountCount}
              </p>
            </CardContent>
          </Card>
        </section>
      </section>

      <MeetingCenter
        initialMonth={initialMonth}
        initialProposals={proposals}
        initialCalendarFeed={calendarFeed}
      />
    </main>
  );
}
