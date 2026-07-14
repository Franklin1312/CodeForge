import { config as dotenvConfig } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// Load .env from monorepo root (one level up from backend/)
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenvConfig({ path: resolve(__dirname, "../../.env") });

import http from "http";
import app from "./app.js";
import { connectDB } from "./config/database.js";
import { connectRedis } from "./config/redis.js";
import { setupWebSocketServer } from "./config/websocket.js";
import { startQueueProcessor } from "./workers/queueProcessor.js";
import { prefetchImages } from "./workers/imageManager.js";
import logger from "./utils/logger.js";

const PORT = process.env.PORT || 3000;

async function bootstrap() {
  try {
    await connectDB();
    await connectRedis();

    const server = http.createServer(app);
    setupWebSocketServer(server);
    startQueueProcessor();

    // Pull Docker images in background — server is ready immediately
    prefetchImages().catch((err) => logger.warn("Image prefetch error:", err.message));

    server.listen(PORT, () => {
      logger.info("CodeForge backend running on port " + PORT);
      logger.info("Environment: " + process.env.NODE_ENV);
      logger.info("WebSocket: ws://localhost:" + PORT + "/ws");
      logger.info("Judge mode: " + (process.env.JUDGE_MOCK === "true" ? "MOCK" : "auto-detect"));
    });

    const shutdown = async (signal) => {
      logger.info(signal + " received - shutting down");
      server.close(async () => {
        const { disconnectDB }    = await import("./config/database.js");
        const { disconnectRedis } = await import("./config/redis.js");
        await disconnectDB();
        await disconnectRedis();
        process.exit(0);
      });
      setTimeout(() => process.exit(1), 10_000);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT",  () => shutdown("SIGINT"));
    process.on("unhandledRejection", (err) => logger.error("Unhandled rejection:", err));
    process.on("uncaughtException",  (err) => { logger.error("Uncaught exception:", err); process.exit(1); });

  } catch (err) {
    logger.error("Failed to start:", err);
    process.exit(1);
  }
}

bootstrap();
