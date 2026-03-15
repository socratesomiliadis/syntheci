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
    <main className="space-y-4 px-4 py-5 md:px-6 md:py-6">
      <section className="grid gap-3 md:grid-cols-3">
        <Card className="border-border/80 bg-card/90 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Awaiting review</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight text-foreground">{counts.proposed}</p>
          </CardContent>
        </Card>
        <Card className="border-border/80 bg-card/90 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Approved to create</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight text-foreground">{counts.approved}</p>
          </CardContent>
        </Card>
        <Card className="border-border/80 bg-card/90 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Connected calendars</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight text-foreground">
              {calendarFeed.connectedAccountCount}
            </p>
          </CardContent>
        </Card>
      </section>

      <MeetingCenter
        initialMonth={initialMonth}
        initialProposals={proposals}
        initialCalendarFeed={calendarFeed}
      />
    </main>
  );
}
