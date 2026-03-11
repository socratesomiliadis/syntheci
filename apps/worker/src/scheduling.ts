import { and, eq } from "drizzle-orm";
import { Queue } from "bullmq";

import { briefings, connectedAccounts, db } from "@syntheci/db";
import { JOB_NAMES, QUEUE_NAMES } from "@syntheci/shared";

import { logger } from "./logger";
import { redis } from "./redis";

const schedulerQueue = new Queue(QUEUE_NAMES.briefing, {
  connection: redis
});
const ingestionSchedulerQueue = new Queue(QUEUE_NAMES.ingestion, {
  connection: redis
});

function formatDateInTimezone(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function getHourInTimezone(date: Date, timeZone: string) {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "2-digit",
      hour12: false
    }).format(date)
  );
}

export async function enqueueDueDailyBriefings() {
  const allWorkspaces = await db.query.workspaces.findMany();
  const now = new Date();

  for (const workspace of allWorkspaces) {
    const hour = getHourInTimezone(now, workspace.timezone);
    if (hour !== 9) {
      continue;
    }

    const briefingDate = formatDateInTimezone(now, workspace.timezone);
    const existing = await db.query.briefings.findFirst({
      where: and(
        eq(briefings.workspaceId, workspace.id),
        eq(briefings.briefingDate, briefingDate)
      )
    });
    if (existing) {
      continue;
    }

    const idempotencyKey = `auto-briefing:${workspace.id}:${briefingDate}`;
    await schedulerQueue.add(
      JOB_NAMES.GENERATE_BRIEFING,
      {
        workspaceId: workspace.id,
        idempotencyKey,
        briefingDate
      },
      {
        jobId: idempotencyKey,
        removeOnComplete: 200,
        removeOnFail: 1000,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1500
        }
      }
    );
  }
}

export async function enqueueDueGmailPollSync() {
  const googleAccounts = await db.query.connectedAccounts.findMany({
    where: eq(connectedAccounts.provider, "google")
  });

  const syncBucket = Math.floor(Date.now() / (5 * 60 * 1000));
  for (const account of googleAccounts) {
    const key = `gmail-sync:${account.id}:${syncBucket}`;
    await ingestionSchedulerQueue.add(
      JOB_NAMES.SYNC_GMAIL_ACCOUNT,
      {
        workspaceId: account.workspaceId,
        connectedAccountId: account.id,
        idempotencyKey: key
      },
      {
        jobId: key,
        removeOnComplete: 200,
        removeOnFail: 1000,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1500
        }
      }
    );
  }
}

export function startDailyBriefingScheduler() {
  const intervalMs = 5 * 60 * 1000;
  const timer = setInterval(() => {
    void Promise.all([enqueueDueDailyBriefings(), enqueueDueGmailPollSync()]).catch((error) => {
      logger.error({ error: error instanceof Error ? error.message : error }, "Scheduler sweep failed");
    });
  }, intervalMs);

  void Promise.all([enqueueDueDailyBriefings(), enqueueDueGmailPollSync()]).catch((error) => {
    logger.error({ error: error instanceof Error ? error.message : error }, "Scheduler initial sweep failed");
  });

  return () => {
    clearInterval(timer);
  };
}
