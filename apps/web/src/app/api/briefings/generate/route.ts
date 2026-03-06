import { NextResponse } from "next/server";
import { z } from "zod";

import { JOB_NAMES, QUEUE_NAMES } from "@syntheci/shared";

import { buildIdempotencyKey } from "@/lib/idempotency";
import { upsertJobAudit } from "@/lib/jobs-audit";
import { enqueueJob, briefingQueue } from "@/lib/queue";
import { requireWorkspaceContext } from "@/lib/session";

const requestSchema = z
  .object({
    date: z.string().date().optional()
  })
  .optional();

function currentDateInTimezone(timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

export async function POST(request: Request) {
  const { workspaceId } = await requireWorkspaceContext();
  const body = requestSchema.parse(await request.json().catch(() => undefined));
  const briefingDate = body?.date ?? currentDateInTimezone("Europe/Athens");
  const idempotencyKey = buildIdempotencyKey("briefing", workspaceId, briefingDate);

  await upsertJobAudit({
    workspaceId,
    queueName: QUEUE_NAMES.briefing,
    jobName: JOB_NAMES.GENERATE_BRIEFING,
    idempotencyKey,
    status: "queued",
    payload: {
      briefingDate
    }
  });

  await enqueueJob({
    queue: briefingQueue,
    name: JOB_NAMES.GENERATE_BRIEFING,
    payload: {
      workspaceId,
      idempotencyKey,
      briefingDate
    }
  });

  return NextResponse.json({
    ok: true,
    briefingDate
  });
}
