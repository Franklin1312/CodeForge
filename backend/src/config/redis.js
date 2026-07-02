import Redis from "ioredis";
import logger from "../utils/logger.js";

let redisClient = null;

const REDIS_OPTIONS = {
  lazyConnect: true,
  enableReadyCheck: true,
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    if (times > 10) {
      logger.error("Redis: max retries reached — giving up");
      return null;
    }
    const delay = Math.min(times * 200, 2000);
    logger.warn(`Redis: retry attempt ${times} in ${delay}ms`);
    return delay;
  },
};

export async function connectRedis() {
  const url = process.env.REDIS_URL || "redis://localhost:6379";

  try {
    redisClient = new Redis(url, REDIS_OPTIONS);

    redisClient.on("connect", () => logger.info("✅ Redis connected"));
    redisClient.on("error", (err) => logger.error("Redis error:", err.message));
    redisClient.on("close", () => logger.warn("Redis connection closed"));

    await redisClient.connect();
    return redisClient;
  } catch (err) {
    logger.error("Redis connection error:", err.message);
    throw err;
  }
}

export async function disconnectRedis() {
  if (redisClient) {
    await redisClient.quit();
    logger.info("Redis connection closed");
  }
}

// Returns the singleton Redis client
export function getRedis() {
  if (!redisClient) {
    throw new Error("Redis not initialized — call connectRedis() first");
  }
  return redisClient;
}

export default { connectRedis, disconnectRedis, getRedis };
