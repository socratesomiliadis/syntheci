import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { db, draftReplies } from "@syntheci/db";

import { requireWorkspaceContext } from "@/lib/session";

export async function POST(
  _request: NextRequest,
  context: {
    params: Promise<{
      draftId: string;
    }>;
  }
) {
  const { workspaceId } = await requireWorkspaceContext();
  const { draftId } = await context.params;

  const draft = await db.query.draftReplies.findFirst({
    where: and(eq(draftReplies.id, draftId), eq(draftReplies.workspaceId, workspaceId))
  });

  if (!draft) {
    return NextResponse.json({ error: "draft not found" }, { status: 404 });
  }

  if (draft.status !== "generated") {
    return NextResponse.json({ error: "draft must be generated before approval" }, { status: 400 });
  }

  const [updated] = await db
    .update(draftReplies)
    .set({
      status: "approved",
      updatedAt: new Date()
    })
    .where(eq(draftReplies.id, draftId))
    .returning({
      id: draftReplies.id,
      status: draftReplies.status
    });

  return NextResponse.json(updated);
}
