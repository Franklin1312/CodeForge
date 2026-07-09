import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import logger from "./utils/logger.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFound } from "./middleware/notFound.js";

// Route imports (populated stage by stage)
import healthRouter from "./routes/health.js";
import authRouter from "./routes/auth.js";
import problemsRouter from "./routes/problems.js";
import submissionsRouter from "./routes/submissions.js";
import aiRouter from "./routes/ai.js";

const app = express();

// ─── Security headers ───────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// ─── CORS ───────────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true, // allow cookies (refresh token)
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ─── Global rate limit ──────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});
app.use("/api/", globalLimiter);

// ─── Body parsing ───────────────────────────────────────────────────
app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());

// ─── HTTP request logging ───────────────────────────────────────────
app.use(
  morgan("combined", {
    stream: { write: (msg) => logger.info(msg.trim()) },
    skip: (req) => req.url === "/api/health", // don't log health checks
  })
);

// ─── Routes ─────────────────────────────────────────────────────────
app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/problems", problemsRouter);
app.use("/api/submissions", submissionsRouter);
app.use("/api/ai", aiRouter);

// ─── Error handling ─────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;
