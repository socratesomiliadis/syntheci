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

export async function enqueueDueGmailWatchRenewals() {
  const googleAccounts = await db.query.connectedAccounts.findMany({
    where: eq(connectedAccounts.provider, "google")
  });

  const now = Date.now();
  for (const account of googleAccounts) {
    const expirationRaw = (account.metadata as Record<string, unknown>)?.watchExpiration;
    const expirationMs =
      typeof expirationRaw === "string" || typeof expirationRaw === "number"
        ? Number(expirationRaw)
        : 0;

    const shouldRenew = !expirationMs || expirationMs - now < 6 * 60 * 60 * 1000;
    if (!shouldRenew) {
      continue;
    }

    const key = `renew-watch:${account.id}:${new Date().toISOString().slice(0, 10)}`;
    await ingestionSchedulerQueue.add(
      JOB_NAMES.RENEW_GMAIL_WATCH,
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

export async function enqueueGmailHistoryFallbackSync() {
  const googleAccounts = await db.query.connectedAccounts.findMany({
    where: eq(connectedAccounts.provider, "google")
  });

  for (const account of googleAccounts) {
    const historyId = (account.metadata as Record<string, unknown>)?.watchHistoryId;
    if (!historyId || typeof historyId !== "string") {
      continue;
    }

    const key = `history-sync:${account.id}:${new Date().toISOString().slice(0, 10)}`;
    await ingestionSchedulerQueue.add(
      JOB_NAMES.INGEST_GMAIL_HISTORY_SYNC,
      {
        workspaceId: account.workspaceId,
        connectedAccountId: account.id,
        historyId,
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
    void Promise.all([
      enqueueDueDailyBriefings(),
      enqueueDueGmailWatchRenewals(),
      enqueueGmailHistoryFallbackSync()
    ]).catch((error) => {
      logger.error({ error: error instanceof Error ? error.message : error }, "Scheduler sweep failed");
    });
  }, intervalMs);

  void Promise.all([
    enqueueDueDailyBriefings(),
    enqueueDueGmailWatchRenewals(),
    enqueueGmailHistoryFallbackSync()
  ]).catch((error) => {
    logger.error({ error: error instanceof Error ? error.message : error }, "Scheduler initial sweep failed");
  });

  return () => {
    clearInterval(timer);
  };
}
