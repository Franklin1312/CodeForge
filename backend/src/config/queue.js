import Bull from "bull";
import logger from "../utils/logger.js";

// ─── Queue singleton ──────────────────────────────────────────────
let judgeQueue = null;

// ─── In-process mock queue for local dev without Redis ───────────
function createMockQueue() {
  let _processor = null;
  let jobId = 1;

  const mock = {
    process(_concurrency, fn) {
      _processor = fn;
      logger.info("Mock queue: processor registered");
    },
    async add(data, opts = {}) {
      const id = jobId++;
      const job = { id, data, opts, attemptsMade: 0 };
      // Run immediately async so callers don't block
      setImmediate(async () => {
        if (_processor) {
          try {
            await _processor(job);
          } catch (err) {
            logger.error(`Mock queue job ${id} failed:`, err.message);
            mock.emit("failed", job, err);
          }
        }
      });
      return { id, ...job };
    },
    _failedHandlers: [],
    _stalledHandlers: [],
    _errorHandlers: [],
    on(event, fn) {
      if (event === "failed")  this._failedHandlers.push(fn);
      if (event === "stalled") this._stalledHandlers.push(fn);
      if (event === "error")   this._errorHandlers.push(fn);
      return this;
    },
    emit(event, ...args) {
      if (event === "failed")  this._failedHandlers.forEach((fn) => fn(...args));
      if (event === "stalled") this._stalledHandlers.forEach((fn) => fn(...args));
      if (event === "error")   this._errorHandlers.forEach((fn) => fn(...args));
    },
    async close() {},
  };
  return mock;
}

export function getJudgeQueue() {
  if (judgeQueue) return judgeQueue;

  // Use in-process mock if Redis mock mode is active or explicitly requested
  if (process.env.REDIS_MOCK === "true") {
    logger.warn("⚠️  Judge queue: using in-process mock (no Redis). Jobs are not persisted.");
    judgeQueue = createMockQueue();
    return judgeQueue;
  }

  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

  try {
    const q = new Bull("judge", redisUrl, {
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: "fixed", delay: 3000 },
        removeOnComplete: 100,
        removeOnFail: 200,
        timeout: parseInt(process.env.JUDGE_TIMEOUT_MS) || 30_000,
      },
      settings: {
        stalledInterval: 15_000,
        maxStalledCount: 1,
      },
    });

    q.on("error", (err) => {
      logger.error("Bull queue error:", err.message);
      // On first connection error in dev, swap to mock queue transparently
      if (process.env.NODE_ENV !== "production" && judgeQueue === q) {
        logger.warn("⚠️  Judge queue: Redis unreachable, swapping to in-process mock.");
        judgeQueue = createMockQueue();
      }
    });
    q.on("stalled", (job) => logger.warn(`Job stalled: ${job.id}`));

    judgeQueue = q;
    logger.info("✅ Judge queue initialized");
    return judgeQueue;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      logger.warn(`⚠️  Bull queue init failed (${err.message}) — using in-process mock.`);
      judgeQueue = createMockQueue();
      return judgeQueue;
    }
    throw err;
  }
}

// ─── Job priority constants ───────────────────────────────────────
// Lower number = higher priority in Bull
export const JOB_PRIORITY = {
  premium: 1,
  user: 5,
  guest: 10,
};

export default getJudgeQueue;

