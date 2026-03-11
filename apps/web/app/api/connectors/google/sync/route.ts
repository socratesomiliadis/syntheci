import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { connectedAccounts, db } from "@syntheci/db";
import { JOB_NAMES, QUEUE_NAMES } from "@syntheci/shared";

import { buildIdempotencyKey } from "@/lib/idempotency";
import { upsertJobAudit } from "@/lib/jobs-audit";
import { enqueueJob, ingestionQueue } from "@/lib/queue";
import { requireWorkspaceContext } from "@/lib/session";

export async function POST() {
  const { workspaceId } = await requireWorkspaceContext();
  const accounts = await db.query.connectedAccounts.findMany({
    where: eq(connectedAccounts.workspaceId, workspaceId)
  });

  const googleAccounts = accounts.filter((account) => account.provider === "google");
  if (googleAccounts.length === 0) {
    return NextResponse.json({ error: "google connector not found" }, { status: 404 });
  }

  const queuedAt = Date.now();
  for (const account of googleAccounts) {
    const idempotencyKey = buildIdempotencyKey(
      "gmail-manual-sync",
      workspaceId,
      account.id,
      queuedAt
    );

    await upsertJobAudit({
      workspaceId,
      queueName: QUEUE_NAMES.ingestion,
      jobName: JOB_NAMES.SYNC_GMAIL_ACCOUNT,
      idempotencyKey,
      payload: {
        connectedAccountId: account.id,
        reason: "manual_sync"
      },
      status: "queued"
    });

    await enqueueJob({
      queue: ingestionQueue,
      name: JOB_NAMES.SYNC_GMAIL_ACCOUNT,
      payload: {
        workspaceId,
        connectedAccountId: account.id,
        idempotencyKey,
        reason: "manual_sync"
      }
    });
  }

  return NextResponse.json({
    ok: true,
    queued: googleAccounts.length
  });
}
