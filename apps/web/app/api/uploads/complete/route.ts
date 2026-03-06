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
  objectKey: z.string().min(1),
  title: z.string().min(1),
  mimeType: z.string().min(1)
});

export async function POST(request: Request) {
  const { workspaceId } = await requireWorkspaceContext();
  const body = requestSchema.parse(await request.json());

  const uploadSource = await upsertSource({
    workspaceId,
    type: "upload",
    displayName: "Manual Uploads",
    metadata: {}
  });

  const [document] = await db
    .insert(documents)
    .values({
      workspaceId,
      sourceId: uploadSource.id,
      title: body.title,
      mimeType: body.mimeType,
      objectKey: body.objectKey,
      rawText: "",
      metadata: {
        status: "uploaded"
      }
    })
    .returning();

  const idempotencyKey = buildIdempotencyKey("upload-process", workspaceId, document.id);
  await upsertJobAudit({
    workspaceId,
    queueName: QUEUE_NAMES.processing,
    jobName: JOB_NAMES.PROCESS_DOCUMENT,
    idempotencyKey,
    status: "queued",
    payload: {
      documentId: document.id
    }
  });

  await enqueueJob({
    queue: processingQueue,
    name: JOB_NAMES.PROCESS_DOCUMENT,
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
