import { WebSocketServer, WebSocket } from "ws";
import { verifyAccessToken } from "../utils/jwt.js";
import logger from "../utils/logger.js";

// ─── Connection registry ──────────────────────────────────────────
// Map<submissionId, Set<WebSocket>>
const subscriptions = new Map();

// Map<WebSocket, { userId, submissionId }>
const clientMeta = new Map();

export function setupWebSocketServer(httpServer) {
  const wss = new WebSocketServer({
    server: httpServer,
    path: "/ws",
  });

  wss.on("connection", (ws, req) => {
    // Parse ?token=<jwt>&submissionId=<id> from the URL
    const url = new URL(req.url, "http://localhost");
    const token = url.searchParams.get("token");
    const submissionId = url.searchParams.get("submissionId");

    if (!token || !submissionId) {
      ws.close(1008, "Missing token or submissionId");
      return;
    }

    // Authenticate
    let user;
    try {
      user = verifyAccessToken(token);
    } catch {
      ws.close(1008, "Invalid or expired token");
      return;
    }

    // Register subscription
    if (!subscriptions.has(submissionId)) {
      subscriptions.set(submissionId, new Set());
    }
    subscriptions.get(submissionId).add(ws);
    clientMeta.set(ws, { userId: user.sub, submissionId });

    logger.debug(`WS: ${user.username} subscribed to submission ${submissionId}`);

    // Heartbeat ping every 25s to keep connection alive
    ws.isAlive = true;
    ws.on("pong", () => { ws.isAlive = true; });

    ws.on("close", () => cleanup(ws));
    ws.on("error", (err) => {
      logger.error("WS client error:", err.message);
      cleanup(ws);
    });

    // Acknowledge connection
    safeSend(ws, { type: "connected", submissionId });
  });

  // Heartbeat interval — drop dead connections
  const heartbeat = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) {
        cleanup(ws);
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 25_000);

  wss.on("close", () => clearInterval(heartbeat));

  logger.info("✅ WebSocket server running on /ws");
  return wss;
}

// ─── Push a verdict update to all subscribers ─────────────────────
export function pushVerdictUpdate(submissionId, payload) {
  const clients = subscriptions.get(submissionId);
  if (!clients || clients.size === 0) return;

  const message = JSON.stringify({ type: "verdict", ...payload });
  for (const ws of clients) {
    safeSend(ws, message, true); // already stringified
  }

  // Auto-cleanup once verdict is final
  if (payload.verdict && payload.verdict !== "pending" && payload.verdict !== "running") {
    setTimeout(() => {
      subscriptions.delete(submissionId);
    }, 5_000);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────
function safeSend(ws, data, isString = false) {
  if (ws.readyState !== WebSocket.OPEN) return;
  try {
    ws.send(isString ? data : JSON.stringify(data));
  } catch (err) {
    logger.error("WS send error:", err.message);
  }
}

function cleanup(ws) {
  const meta = clientMeta.get(ws);
  if (meta) {
    const clients = subscriptions.get(meta.submissionId);
    if (clients) {
      clients.delete(ws);
      if (clients.size === 0) subscriptions.delete(meta.submissionId);
    }
    clientMeta.delete(ws);
  }
}
