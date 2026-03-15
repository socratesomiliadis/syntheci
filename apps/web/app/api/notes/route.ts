import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db, documents } from "@syntheci/db";
import { buildDocumentDashboardUrl, JOB_NAMES, QUEUE_NAMES } from "@syntheci/shared";

import { upsertSource } from "@/lib/connectors";
import { buildIdempotencyKey } from "@/lib/idempotency";
import { upsertJobAudit } from "@/lib/jobs-audit";
import { enqueueJob, processingQueue } from "@/lib/queue";
import { requireWorkspaceContext } from "@/lib/session";

const requestSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1)
});

export async function POST(request: Request) {
  const { workspaceId } = await requireWorkspaceContext();
  const body = requestSchema.parse(await request.json());

  const noteSource = await upsertSource({
    workspaceId,
    type: "note",
    displayName: "Manual Notes"
  });

  const [document] = await db
    .insert(documents)
    .values({
      workspaceId,
      sourceId: noteSource.id,
      title: body.title,
      noteBody: body.body,
      rawText: body.body,
      externalUrl: "",
      metadata: {
        status: "note_created"
      }
    })
    .returning();

  const [documentWithUrl] = await db
    .update(documents)
    .set({
      externalUrl: buildDocumentDashboardUrl(document.id),
      updatedAt: new Date()
    })
    .where(eq(documents.id, document.id))
    .returning();

  const idempotencyKey = buildIdempotencyKey("note-process", workspaceId, documentWithUrl.id);
  await upsertJobAudit({
    workspaceId,
    queueName: QUEUE_NAMES.processing,
    jobName: JOB_NAMES.PROCESS_NOTE,
    idempotencyKey,
    status: "queued",
    payload: {
      documentId: documentWithUrl.id
    }
  });

  await enqueueJob({
    queue: processingQueue,
    name: JOB_NAMES.PROCESS_NOTE,
    payload: {
      workspaceId,
      idempotencyKey,
      documentId: documentWithUrl.id
    }
  });

  return NextResponse.json({
    ok: true,
    documentId: documentWithUrl.id
  });
}
