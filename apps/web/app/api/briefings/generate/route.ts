import { NextResponse } from "next/server";
import { z } from "zod";

import { briefings, db } from "@syntheci/db";
import { JOB_NAMES, QUEUE_NAMES } from "@syntheci/shared";
import { and, eq } from "drizzle-orm";

import { buildIdempotencyKey } from "@/lib/idempotency";
import { upsertJobAudit } from "@/lib/jobs-audit";
import { enqueueJob, briefingQueue } from "@/lib/queue";
import { requireWorkspaceContext } from "@/lib/session";

const requestSchema = z
  .object({
    date: z.string().date().optional(),
    waitForCompletion: z.boolean().optional()
  })
  .optional();

const WAIT_TIMEOUT_MS = 12_000;
const WAIT_INTERVAL_MS = 400;

function currentDateInTimezone(timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForBriefing(input: {
  workspaceId: string;
  briefingDate: string;
  previousGeneratedAt?: Date | null;
  timeoutMs?: number;
}) {
  const deadline = Date.now() + (input.timeoutMs ?? WAIT_TIMEOUT_MS);

  while (Date.now() < deadline) {
    const briefing = await db.query.briefings.findFirst({
      where: and(
        eq(briefings.workspaceId, input.workspaceId),
        eq(briefings.briefingDate, input.briefingDate)
      )
    });

    if (
      briefing &&
      (!input.previousGeneratedAt ||
        briefing.generatedAt.getTime() > input.previousGeneratedAt.getTime())
    ) {
      return briefing;
    }

    await sleep(WAIT_INTERVAL_MS);
  }

  return null;
}

export async function POST(request: Request) {
  const { workspaceId } = await requireWorkspaceContext();
  const body = requestSchema.parse(await request.json().catch(() => undefined));
  const briefingDate = body?.date ?? currentDateInTimezone("Europe/Athens");
  const existingBriefing = body?.waitForCompletion
    ? await db.query.briefings.findFirst({
        where: and(
          eq(briefings.workspaceId, workspaceId),
          eq(briefings.briefingDate, briefingDate)
        )
      })
    : null;
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

  if (body?.waitForCompletion) {
    const briefing = await waitForBriefing({
      workspaceId,
      briefingDate,
      previousGeneratedAt: existingBriefing?.generatedAt ?? null
    });

    if (briefing) {
      return NextResponse.json({
        ok: true,
        briefingDate,
        completed: true,
        briefing
      });
    }
  }

  return NextResponse.json({
    ok: true,
    briefingDate,
    completed: false
  });
}
