import { and, eq } from "drizzle-orm";

import { db, jobsAudit } from "@syntheci/db";

export async function upsertJobAudit(input: {
  workspaceId?: string;
  queueName: string;
  jobName: string;
  idempotencyKey: string;
  status: string;
  attempts?: number;
  payload?: Record<string, unknown>;
  lastError?: string;
}) {
  await db
    .insert(jobsAudit)
    .values({
      workspaceId: input.workspaceId ?? null,
      queueName: input.queueName,
      jobName: input.jobName,
      idempotencyKey: input.idempotencyKey,
      status: input.status,
      attempts: input.attempts ?? 0,
      payload: input.payload ?? {},
      lastError: input.lastError ?? null
    })
    .onConflictDoUpdate({
      target: [jobsAudit.queueName, jobsAudit.idempotencyKey],
      set: {
        status: input.status,
        attempts: input.attempts ?? 0,
        payload: input.payload ?? {},
        lastError: input.lastError ?? null,
        updatedAt: new Date()
      }
    });
}

export async function isDuplicateJob(queueName: string, idempotencyKey: string) {
  const existing = await db.query.jobsAudit.findFirst({
    where: and(
      eq(jobsAudit.queueName, queueName),
      eq(jobsAudit.idempotencyKey, idempotencyKey),
      eq(jobsAudit.status, "completed")
    )
  });

  return Boolean(existing);
}
