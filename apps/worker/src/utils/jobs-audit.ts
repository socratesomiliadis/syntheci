import { and, eq } from "drizzle-orm";

import { db, jobsAudit } from "@syntheci/db";

export async function markJobStatus(input: {
  queueName: string;
  idempotencyKey: string;
  status: "processing" | "completed" | "failed";
  attempts?: number;
  workspaceId?: string;
  lastError?: string;
  payload?: Record<string, unknown>;
}) {
  await db
    .insert(jobsAudit)
    .values({
      workspaceId: input.workspaceId ?? null,
      queueName: input.queueName,
      jobName: "unknown",
      idempotencyKey: input.idempotencyKey,
      status: input.status,
      attempts: input.attempts ?? 0,
      lastError: input.lastError ?? null,
      payload: input.payload ?? {}
    })
    .onConflictDoUpdate({
      target: [jobsAudit.queueName, jobsAudit.idempotencyKey],
      set: {
        status: input.status,
        attempts: input.attempts ?? 0,
        lastError: input.lastError ?? null,
        payload: input.payload ?? {},
        updatedAt: new Date()
      }
    });
}

export async function isJobCompleted(queueName: string, idempotencyKey: string) {
  const row = await db.query.jobsAudit.findFirst({
    where: and(
      eq(jobsAudit.queueName, queueName),
      eq(jobsAudit.idempotencyKey, idempotencyKey),
      eq(jobsAudit.status, "completed")
    )
  });
  return Boolean(row);
}
