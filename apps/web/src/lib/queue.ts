import { Queue } from "bullmq";

import { JOB_NAMES, QUEUE_NAMES, type BaseJobPayload } from "@syntheci/shared";

import { redis } from "./redis";

const globalForQueues = globalThis as unknown as {
  ingestionQueue?: Queue;
  processingQueue?: Queue;
  triageQueue?: Queue;
  briefingQueue?: Queue;
  actionsQueue?: Queue;
};

export const ingestionQueue =
  globalForQueues.ingestionQueue ??
  new Queue(QUEUE_NAMES.ingestion, {
    connection: redis
  });

export const processingQueue =
  globalForQueues.processingQueue ??
  new Queue(QUEUE_NAMES.processing, {
    connection: redis
  });

export const triageQueue =
  globalForQueues.triageQueue ??
  new Queue(QUEUE_NAMES.triage, {
    connection: redis
  });

export const briefingQueue =
  globalForQueues.briefingQueue ??
  new Queue(QUEUE_NAMES.briefing, {
    connection: redis
  });

export const actionsQueue =
  globalForQueues.actionsQueue ??
  new Queue(QUEUE_NAMES.actions, {
    connection: redis
  });

if (process.env.NODE_ENV !== "production") {
  globalForQueues.ingestionQueue = ingestionQueue;
  globalForQueues.processingQueue = processingQueue;
  globalForQueues.triageQueue = triageQueue;
  globalForQueues.briefingQueue = briefingQueue;
  globalForQueues.actionsQueue = actionsQueue;
}

export async function enqueueJob<T extends BaseJobPayload>(params: {
  queue: Queue;
  name: (typeof JOB_NAMES)[keyof typeof JOB_NAMES];
  payload: T;
}) {
  await params.queue.add(params.name, params.payload, {
    jobId: params.payload.idempotencyKey,
    removeOnComplete: 500,
    removeOnFail: 2000,
    attempts: 4,
    backoff: {
      type: "exponential",
      delay: 2000
    }
  });
}
