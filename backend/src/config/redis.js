import Redis from "ioredis";
import logger from "../utils/logger.js";

let redisClient = null;

// ─── In-memory mock for local dev without Redis ───────────────────
function createMockRedis() {
  const store = new Map();
  const expiries = new Map();

  function isExpired(key) {
    const exp = expiries.get(key);
    if (exp && Date.now() > exp) {
      store.delete(key);
      expiries.delete(key);
      return true;
    }
    return false;
  }

  const mock = {
    async incr(key) {
      if (isExpired(key)) { /* removed */ }
      const val = (parseInt(store.get(key) || "0") || 0) + 1;
      store.set(key, String(val));
      return val;
    },
    async get(key) {
      if (isExpired(key)) return null;
      return store.get(key) ?? null;
    },
    async set(key, value, ...args) {
      store.set(key, String(value));
      // Handle SET key val EX seconds
      const exIdx = args.indexOf("EX");
      if (exIdx !== -1 && args[exIdx + 1]) {
        expiries.set(key, Date.now() + args[exIdx + 1] * 1000);
      }
      return "OK";
    },
    async expire(key, seconds) {
      expiries.set(key, Date.now() + seconds * 1000);
      return 1;
    },
    async del(...keys) {
      keys.flat().forEach((k) => { store.delete(k); expiries.delete(k); });
      return keys.flat().length;
    },
    async quit() { return "OK"; },
    on() { return mock; }, // no-op event emitter
    status: "ready",
  };
  return mock;
}

const REDIS_OPTIONS = {
  lazyConnect: true,
  enableReadyCheck: true,
  maxRetriesPerRequest: 1,
  retryStrategy: (times) => {
    if (times > 3) return null; // stop quickly in dev
    return Math.min(times * 200, 1000);
  },
};

export async function connectRedis() {
  // Allow forcing mock via env (useful for local dev without Redis)
  if (process.env.REDIS_MOCK === "true") {
    logger.warn("⚠️  Redis: using in-memory mock (REDIS_MOCK=true). AI rate limits & queue are non-persistent.");
    redisClient = createMockRedis();
    return redisClient;
  }

  const url = process.env.REDIS_URL || "redis://localhost:6379";

  try {
    const client = new Redis(url, REDIS_OPTIONS);

    client.on("error", (err) => logger.error("Redis error:", err.message));
    client.on("close", () => logger.warn("Redis connection closed"));

    await client.connect();
    logger.info("✅ Redis connected");
    redisClient = client;
    return redisClient;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      logger.warn(`⚠️  Redis unavailable (${err.message}) — falling back to in-memory mock.`);
      logger.warn("   AI rate limits and job queue will be non-persistent across restarts.");
      redisClient = createMockRedis();
      return redisClient;
    }
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
