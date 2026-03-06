import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { db, sources } from "@syntheci/db";
import { JOB_NAMES, QUEUE_NAMES } from "@syntheci/shared";

import { buildIdempotencyKey } from "@/lib/idempotency";
import { upsertJobAudit } from "@/lib/jobs-audit";
import { enqueueJob, ingestionQueue } from "@/lib/queue";
import { verifySlackSignature } from "@/lib/slack";

interface SlackEventEnvelope {
  type: string;
  challenge?: string;
  event_id?: string;
  team_id?: string;
  event?: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  const timestamp = request.headers.get("x-slack-request-timestamp");
  const signature = request.headers.get("x-slack-signature");

  const rawBody = await request.text();
  if (!timestamp || !signature || !verifySlackSignature(rawBody, timestamp, signature)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const body = JSON.parse(rawBody) as SlackEventEnvelope;

  if (body.type === "url_verification") {
    return NextResponse.json({ challenge: body.challenge });
  }

  if (body.type !== "event_callback" || !body.team_id || !body.event) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const source = await db.query.sources.findFirst({
    where: and(eq(sources.type, "slack"), eq(sources.externalSourceId, body.team_id))
  });

  if (!source) {
    return NextResponse.json({ ok: true, skipped: "unmatched_team" });
  }

  const idempotencyKey = buildIdempotencyKey("slack-event", body.event_id, timestamp);

  await upsertJobAudit({
    workspaceId: source.workspaceId,
    queueName: QUEUE_NAMES.ingestion,
    jobName: JOB_NAMES.INGEST_SLACK_EVENT,
    idempotencyKey,
    status: "queued",
    payload: body as unknown as Record<string, unknown>
  });

  await enqueueJob({
    queue: ingestionQueue,
    name: JOB_NAMES.INGEST_SLACK_EVENT,
    payload: {
      workspaceId: source.workspaceId,
      sourceId: source.id,
      idempotencyKey,
      event: body.event
    }
  });

  return NextResponse.json({ ok: true });
}
