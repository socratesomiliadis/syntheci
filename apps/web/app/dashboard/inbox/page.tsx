import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PriorityInbox } from "@/components/dashboard/priority-inbox";
import { getOpenThreadCount, getPriorityInbox } from "@/lib/dashboard";
import { requireWorkspaceContext } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const { workspaceId } = await requireWorkspaceContext();
  const [items, openThreadCount] = await Promise.all([
    getPriorityInbox(workspaceId),
    getOpenThreadCount(workspaceId)
  ]);

  const unreadCount = items.filter((item) => item.isUnread).length;
  const urgentCount = items.filter((item) => item.label === "urgent").length;

  return (
    <main className="space-y-4 px-4 py-5 md:px-6 md:py-6">
      <section className="grid gap-3 md:grid-cols-3">
        <Card className="border-border/80 bg-card/90 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Open threads</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight text-foreground">{openThreadCount}</p>
          </CardContent>
        </Card>
        <Card className="border-border/80 bg-card/90 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Unread in queue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight text-foreground">{unreadCount}</p>
          </CardContent>
        </Card>
        <Card className="border-border/80 bg-card/90 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Urgent labels</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight text-foreground">{urgentCount}</p>
          </CardContent>
        </Card>
      </section>

      <PriorityInbox initialItems={items} />
    </main>
  );
}
