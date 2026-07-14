import { config as dotenvConfig } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenvConfig({ path: resolve(__dirname, "../.env") });

import { connectDB } from "./src/config/database.js";
import { connectRedis } from "./src/config/redis.js";
import { setupWebSocketServer } from "./src/config/websocket.js";
import { startQueueProcessor } from "./src/workers/queueProcessor.js";
import http from "http";
import app from "./src/app.js";

async function test() {
  console.log("=== Step 1: connectDB ===");
  try {
    await connectDB();
    console.log("connectDB: OK");
  } catch (e) {
    console.error("connectDB FAILED:", e.message);
    console.error(e.stack);
    process.exit(1);
  }

  console.log("=== Step 2: connectRedis ===");
  try {
    await connectRedis();
    console.log("connectRedis: OK");
  } catch (e) {
    console.error("connectRedis FAILED:", e.message);
    console.error(e.stack);
    process.exit(1);
  }

  console.log("=== Step 3: WebSocket + Queue ===");
  try {
    const server = http.createServer(app);
    setupWebSocketServer(server);
    startQueueProcessor();
    console.log("WebSocket + Queue: OK");
  } catch (e) {
    console.error("WebSocket/Queue FAILED:", e.message);
    console.error(e.stack);
    process.exit(1);
  }

  console.log("=== Step 4: Listen ===");
  const server2 = http.createServer(app);
  server2.listen(3001, () => {
    console.log("Server listening on :3001 — all good!");
    process.exit(0);
  });
  server2.on("error", (e) => {
    console.error("Listen FAILED:", e.message);
    process.exit(1);
  });
}

test().catch((e) => {
  console.error("Unhandled:", e.message, e.stack);
  process.exit(1);
});
