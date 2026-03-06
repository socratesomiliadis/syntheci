import { NextResponse } from "next/server";
import { z } from "zod";

import { db, documents } from "@syntheci/db";
import { JOB_NAMES, QUEUE_NAMES } from "@syntheci/shared";

import { upsertSource } from "@/lib/connectors";
import { buildIdempotencyKey } from "@/lib/idempotency";
import { upsertJobAudit } from "@/lib/jobs-audit";
import { enqueueJob, processingQueue } from "@/lib/queue";
import { requireWorkspaceContext } from "@/lib/session";

const requestSchema = z.object({
  url: z.string().url()
});

export async function POST(request: Request) {
  const { workspaceId } = await requireWorkspaceContext();
  const body = requestSchema.parse(await request.json());

  const linkSource = await upsertSource({
    workspaceId,
    type: "link",
    displayName: "Imported Links"
  });

  const [document] = await db
    .insert(documents)
    .values({
      workspaceId,
      sourceId: linkSource.id,
      title: body.url,
      externalUrl: body.url,
      rawText: "",
      metadata: {
        status: "link_queued"
      }
    })
    .returning();

  const idempotencyKey = buildIdempotencyKey("link-process", workspaceId, document.id);
  await upsertJobAudit({
    workspaceId,
    queueName: QUEUE_NAMES.processing,
    jobName: JOB_NAMES.PROCESS_LINK,
    idempotencyKey,
    status: "queued",
    payload: {
      documentId: document.id
    }
  });

  await enqueueJob({
    queue: processingQueue,
    name: JOB_NAMES.PROCESS_LINK,
    payload: {
      workspaceId,
      idempotencyKey,
      documentId: document.id
    }
  });

  return NextResponse.json({
    ok: true,
    documentId: document.id
  });
}
