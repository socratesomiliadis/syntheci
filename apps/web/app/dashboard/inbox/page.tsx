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
    <main className="space-y-6 px-4 py-5 md:px-6 md:py-6">
      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="rounded-[1.75rem] border-slate-200/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.95),rgba(255,248,237,0.94))] shadow-sm">
          <CardHeader>
            <CardTitle className="text-3xl tracking-tight text-slate-950">Work the inbox in ranked order</CardTitle>
          </CardHeader>
          <CardContent className="max-w-2xl text-sm leading-6 text-slate-600">
            This queue surfaces the highest-value threads first so you can re-triage, draft replies, and extract meetings without hunting through the whole mailbox.
          </CardContent>
        </Card>

        <section className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
          <Card className="rounded-[1.4rem] border-slate-200/80 bg-white/90 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-700">Open threads</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-semibold tracking-tight text-slate-950">{openThreadCount}</p>
            </CardContent>
          </Card>
          <Card className="rounded-[1.4rem] border-slate-200/80 bg-white/90 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-700">Unread in queue</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-semibold tracking-tight text-slate-950">{unreadCount}</p>
            </CardContent>
          </Card>
          <Card className="rounded-[1.4rem] border-slate-200/80 bg-white/90 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-700">Urgent labels</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-semibold tracking-tight text-slate-950">{urgentCount}</p>
            </CardContent>
          </Card>
        </section>
      </section>

      <PriorityInbox initialItems={items} />
    </main>
  );
}
