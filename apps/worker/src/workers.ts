import { and, eq } from "drizzle-orm";
import { Worker, type Job } from "bullmq";

import { db, documents, messages, triageResults } from "@syntheci/db";
import { JOB_NAMES, QUEUE_NAMES } from "@syntheci/shared";

import { logger } from "./logger";
import { buildAndStoreBriefing } from "./services/briefing";
import { extractTextFromObject, extractTextFromUrl } from "./services/extractors";
import { ingestGmailNotification, renewGmailWatch } from "./services/gmail";
import { indexDocumentText } from "./services/indexing";
import { redis } from "./redis";
import { markJobStatus } from "./utils/jobs-audit";

interface BaseJobData {
  workspaceId: string;
  idempotencyKey: string;
}

async function withAudit(job: Job, handler: () => Promise<void>) {
  const data = job.data as BaseJobData;
  await markJobStatus({
    queueName: job.queueName,
    idempotencyKey: data.idempotencyKey,
    status: "processing",
    workspaceId: data.workspaceId,
    attempts: job.attemptsMade + 1,
    payload: job.data as Record<string, unknown>
  });

  try {
    await handler();
    await markJobStatus({
      queueName: job.queueName,
      idempotencyKey: data.idempotencyKey,
      status: "completed",
      workspaceId: data.workspaceId,
      attempts: job.attemptsMade + 1
    });
  } catch (error) {
    await markJobStatus({
      queueName: job.queueName,
      idempotencyKey: data.idempotencyKey,
      status: "failed",
      workspaceId: data.workspaceId,
      attempts: job.attemptsMade + 1,
      lastError: error instanceof Error ? error.message : "worker error"
    });
    throw error;
  }
}

function processIngestionJob(job: Job) {
  return withAudit(job, async () => {
    if (job.name === JOB_NAMES.INGEST_GMAIL_NOTIFICATION) {
      const data = job.data as BaseJobData & {
        connectedAccountId: string;
        historyId: string;
      };
      await ingestGmailNotification({
        workspaceId: data.workspaceId,
        connectedAccountId: data.connectedAccountId,
        historyId: data.historyId
      });
      return;
    }

    if (job.name === JOB_NAMES.INGEST_GMAIL_HISTORY_SYNC) {
      const data = job.data as BaseJobData & {
        connectedAccountId: string;
        historyId: string;
      };
      await ingestGmailNotification({
        workspaceId: data.workspaceId,
        connectedAccountId: data.connectedAccountId,
        historyId: data.historyId
      });
      return;
    }

    if (job.name === JOB_NAMES.RENEW_GMAIL_WATCH) {
      const data = job.data as BaseJobData & {
        connectedAccountId: string;
      };
      await renewGmailWatch({
        workspaceId: data.workspaceId,
        connectedAccountId: data.connectedAccountId
      });
      return;
    }
  });
}

function processDocumentJob(job: Job) {
  return withAudit(job, async () => {
    const data = job.data as BaseJobData & {
      documentId: string;
    };

    const document = await db.query.documents.findFirst({
      where: and(eq(documents.id, data.documentId), eq(documents.workspaceId, data.workspaceId))
    });
    if (!document) {
      throw new Error("Document not found for processing");
    }

    if (job.name === JOB_NAMES.PROCESS_NOTE) {
      await indexDocumentText({
        workspaceId: data.workspaceId,
        sourceId: document.sourceId,
        documentId: document.id,
        text: document.rawText
      });
      return;
    }

    if (job.name === JOB_NAMES.PROCESS_LINK) {
      if (!document.externalUrl) {
        throw new Error("Link document missing external URL");
      }
      const extracted = await extractTextFromUrl(document.externalUrl);
      await db
        .update(documents)
        .set({
          title: extracted.title,
          rawText: extracted.text,
          metadata: {
            ...(document.metadata as Record<string, unknown>),
            extraction: "readability",
            extractedAt: new Date().toISOString()
          },
          updatedAt: new Date()
        })
        .where(eq(documents.id, document.id));

      await indexDocumentText({
        workspaceId: data.workspaceId,
        sourceId: document.sourceId,
        documentId: document.id,
        text: extracted.text
      });
      return;
    }

    if (job.name === JOB_NAMES.PROCESS_DOCUMENT) {
      if (!document.objectKey) {
        throw new Error("Upload document missing object key");
      }
      const text = await extractTextFromObject({
        objectKey: document.objectKey,
        mimeType: document.mimeType
      });
      await db
        .update(documents)
        .set({
          rawText: text,
          metadata: {
            ...(document.metadata as Record<string, unknown>),
            extraction: "file",
            extractedAt: new Date().toISOString()
          },
          updatedAt: new Date()
        })
        .where(eq(documents.id, document.id));

      await indexDocumentText({
        workspaceId: data.workspaceId,
        sourceId: document.sourceId,
        documentId: document.id,
        text
      });
      return;
    }
  });
}

function processTriageJob(job: Job) {
  return withAudit(job, async () => {
    if (job.name !== JOB_NAMES.TRIAGE_MESSAGE) {
      return;
    }
    const data = job.data as BaseJobData & {
      messageId: string;
      label: string;
      confidence: number;
      rationale: string;
    };

    const message = await db.query.messages.findFirst({
      where: and(eq(messages.id, data.messageId), eq(messages.workspaceId, data.workspaceId))
    });
    if (!message) {
      throw new Error("Message not found for triage persist");
    }

    await db
      .insert(triageResults)
      .values({
        workspaceId: data.workspaceId,
        messageId: data.messageId,
        label: data.label as
          | "urgent"
          | "needs_reply"
          | "follow_up"
          | "scheduling"
          | "informational",
        confidence: data.confidence,
        rationale: data.rationale,
        modelVersion: process.env.OPENAI_CHAT_MODEL ?? "gpt-4.1-mini"
      })
      .onConflictDoUpdate({
        target: triageResults.messageId,
        set: {
          label: data.label as
            | "urgent"
            | "needs_reply"
            | "follow_up"
            | "scheduling"
            | "informational",
          confidence: data.confidence,
          rationale: data.rationale,
          updatedAt: new Date()
        }
      });
  });
}

function processBriefingJob(job: Job) {
  return withAudit(job, async () => {
    if (job.name !== JOB_NAMES.GENERATE_BRIEFING) {
      return;
    }

    const data = job.data as BaseJobData & {
      briefingDate: string;
    };

    await buildAndStoreBriefing({
      workspaceId: data.workspaceId,
      briefingDate: data.briefingDate
    });
  });
}

function processActionsJob(job: Job) {
  return withAudit(job, async () => {
    if (job.name === JOB_NAMES.CREATE_CALENDAR_EVENT) {
      logger.info({ jobId: job.id }, "Calendar creation action job currently handled via API");
    }
  });
}

const workerConcurrency = Number(process.env.WORKER_CONCURRENCY ?? 5);

export const ingestionWorker = new Worker(QUEUE_NAMES.ingestion, processIngestionJob, {
  connection: redis,
  concurrency: workerConcurrency
});

export const processingWorker = new Worker(QUEUE_NAMES.processing, processDocumentJob, {
  connection: redis,
  concurrency: workerConcurrency
});

export const triageWorker = new Worker(QUEUE_NAMES.triage, processTriageJob, {
  connection: redis,
  concurrency: workerConcurrency
});

export const briefingWorker = new Worker(QUEUE_NAMES.briefing, processBriefingJob, {
  connection: redis,
  concurrency: 2
});

export const actionsWorker = new Worker(QUEUE_NAMES.actions, processActionsJob, {
  connection: redis,
  concurrency: workerConcurrency
});

for (const worker of [
  ingestionWorker,
  processingWorker,
  triageWorker,
  briefingWorker,
  actionsWorker
]) {
  worker.on("completed", (job) => {
    logger.info({ queue: worker.name, jobId: job.id, jobName: job.name }, "Job completed");
  });
  worker.on("failed", (job, error) => {
    logger.error(
      {
        queue: worker.name,
        jobId: job?.id,
        jobName: job?.name,
        error: error.message
      },
      "Job failed"
    );
  });
}
