import "dotenv/config";
import app from "./app.js";
import { connectDB } from "./config/database.js";
import { connectRedis } from "./config/redis.js";
import logger from "./utils/logger.js";

const PORT = process.env.PORT || 3000;

async function bootstrap() {
  try {
    // Connect to MongoDB
    await connectDB();

    // Connect to Redis
    await connectRedis();

    // Start HTTP server
    const server = app.listen(PORT, () => {
      logger.info(`🚀 CodeForge backend running on port ${PORT}`);
      logger.info(`📡 Environment: ${process.env.NODE_ENV}`);
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      logger.info(`${signal} received — shutting down gracefully`);
      server.close(async () => {
        const { disconnectDB } = await import("./config/database.js");
        const { disconnectRedis } = await import("./config/redis.js");
        await disconnectDB();
        await disconnectRedis();
        logger.info("Server closed");
        process.exit(0);
      });
      // Force-kill after 10s if connections don't drain
      setTimeout(() => process.exit(1), 10_000);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

    // Catch unhandled errors so the process doesn't silently die
    process.on("unhandledRejection", (err) => {
      logger.error("Unhandled rejection:", err);
    });
    process.on("uncaughtException", (err) => {
      logger.error("Uncaught exception:", err);
      process.exit(1);
    });
  } catch (err) {
    logger.error("Failed to start server:", err);
    process.exit(1);
  }
}

bootstrap();
