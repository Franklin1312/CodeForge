import Bull from "bull";
import logger from "../utils/logger.js";

// ─── Queue singleton ──────────────────────────────────────────────
let judgeQueue = null;

export function getJudgeQueue() {
  if (judgeQueue) return judgeQueue;

  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

  judgeQueue = new Bull("judge", redisUrl, {
    defaultJobOptions: {
      attempts: 2,                   // retry once on system error
      backoff: { type: "fixed", delay: 3000 },
      removeOnComplete: 100,         // keep last 100 completed jobs
      removeOnFail: 200,
      timeout: parseInt(process.env.JUDGE_TIMEOUT_MS) || 30_000,
    },
    settings: {
      stalledInterval: 15_000,
      maxStalledCount: 1,
    },
  });

  judgeQueue.on("error", (err) => logger.error("Bull queue error:", err.message));
  judgeQueue.on("stalled", (job) => logger.warn(`Job stalled: ${job.id}`));

  logger.info("✅ Judge queue initialized");
  return judgeQueue;
}

// ─── Job priority constants ───────────────────────────────────────
// Lower number = higher priority in Bull
export const JOB_PRIORITY = {
  premium: 1,
  user: 5,
  guest: 10,
};

export default getJudgeQueue;
