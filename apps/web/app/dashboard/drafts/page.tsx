import { and, desc, eq, sql } from "drizzle-orm";

import { db, draftReplies } from "@syntheci/db";

import { DraftCenter } from "@/components/dashboard/draft-center";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireWorkspaceContext } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DraftsPage() {
  const { workspaceId } = await requireWorkspaceContext();

  const [drafts, pendingCount, approvedCount] = await Promise.all([
    db.query.draftReplies.findMany({
      where: eq(draftReplies.workspaceId, workspaceId),
      orderBy: [desc(draftReplies.createdAt)],
      limit: 30
    }),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(draftReplies)
      .where(and(eq(draftReplies.workspaceId, workspaceId), eq(draftReplies.status, "generated"))),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(draftReplies)
      .where(and(eq(draftReplies.workspaceId, workspaceId), eq(draftReplies.status, "approved")))
  ]);

  return (
    <main className="space-y-6 px-4 py-5 md:px-6 md:py-6">
      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="rounded-[1.75rem] border-slate-200/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.95),rgba(239,246,255,0.94))] shadow-sm">
          <CardHeader>
            <CardTitle className="text-3xl tracking-tight text-slate-950">Approve with confidence before anything sends</CardTitle>
          </CardHeader>
          <CardContent className="max-w-2xl text-sm leading-6 text-slate-600">
            Generated replies land here first so the human review step stays obvious and fast.
          </CardContent>
        </Card>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <Card className="rounded-[1.4rem] border-slate-200/80 bg-white/90 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-700">Awaiting approval</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-semibold tracking-tight text-slate-950">
                {Number(pendingCount[0]?.count ?? 0)}
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-[1.4rem] border-slate-200/80 bg-white/90 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-700">Approved and ready</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-semibold tracking-tight text-slate-950">
                {Number(approvedCount[0]?.count ?? 0)}
              </p>
            </CardContent>
          </Card>
        </section>
      </section>

      <DraftCenter initialDrafts={drafts} />
    </main>
  );
}
