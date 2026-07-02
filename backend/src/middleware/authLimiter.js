import rateLimit from "express-rate-limit";

// Auth endpoints get a tighter rate limit than the global one.
// Prevents brute-force on login/register without blocking normal API traffic.

// ─── Login rate limit ─────────────────────────────────────────────
// 10 attempts per 15 minutes per IP
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // only count failed attempts
  message: {
    error: {
      code: "RATE_LIMITED",
      message: "Too many login attempts. Please try again in 15 minutes.",
    },
  },
  keyGenerator: (req) => {
    // Rate limit by IP + email combo to allow multiple users on same IP
    const email = req.body?.email?.toLowerCase() || "unknown";
    return `${req.ip}:${email}`;
  },
});

// ─── Register rate limit ──────────────────────────────────────────
// 5 registrations per hour per IP
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: "RATE_LIMITED",
      message: "Too many registration attempts. Please try again in 1 hour.",
    },
  },
});

// ─── Refresh rate limit ───────────────────────────────────────────
// 30 refreshes per 15 minutes — generous for silent background refreshes
export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: "RATE_LIMITED",
      message: "Token refresh rate limit exceeded.",
    },
  },
});
