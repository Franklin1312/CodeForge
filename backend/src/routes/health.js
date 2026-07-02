import { Router } from "express";
import mongoose from "mongoose";
import { getRedis } from "../config/redis.js";

const router = Router();

// GET /api/health
// Checks MongoDB + Redis connectivity. Used by Docker/K8s liveness probes.
router.get("/", async (req, res) => {
  const checks = {
    server: "ok",
    mongodb: "unknown",
    redis: "unknown",
  };

  // MongoDB check
  try {
    const state = mongoose.connection.readyState;
    checks.mongodb = state === 1 ? "ok" : `degraded (state: ${state})`;
  } catch {
    checks.mongodb = "error";
  }

  // Redis check
  try {
    const redis = getRedis();
    await redis.ping();
    checks.redis = "ok";
  } catch {
    checks.redis = "error";
  }

  const isHealthy = Object.values(checks).every((v) => v === "ok");

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    version: process.env.npm_package_version || "1.0.0",
    checks,
  });
});

export default router;
