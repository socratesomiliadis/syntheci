import { logger } from "./logger";
import { redis } from "./redis";
import { startDailyBriefingScheduler } from "./scheduling";
import {
  actionsWorker,
  briefingWorker,
  ingestionWorker,
  processingWorker,
  triageWorker
} from "./workers";

logger.info("Syntheci worker started");

const stopScheduler = startDailyBriefingScheduler();

async function shutdown(signal: string) {
  logger.info({ signal }, "Shutting down worker");
  stopScheduler();
  await Promise.all([
    ingestionWorker.close(),
    processingWorker.close(),
    triageWorker.close(),
    briefingWorker.close(),
    actionsWorker.close()
  ]);
  await redis.quit();
  process.exit(0);
}

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});
