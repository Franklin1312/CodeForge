import jwt from "jsonwebtoken";
import crypto from "crypto";
import { AppError } from "../middleware/errorHandler.js";

// ─── Key loading ──────────────────────────────────────────────────
// Keys come from env vars as PEM strings with literal \n escapes.
// Replace the escape sequences to get real newlines.
function loadKey(envVar) {
  const raw = process.env[envVar];
  if (!raw) throw new Error(`${envVar} is not set in environment variables`);
  return raw.replace(/\\n/g, "\n");
}

function getPrivateKey() { return loadKey("JWT_PRIVATE_KEY"); }
function getPublicKey()  { return loadKey("JWT_PUBLIC_KEY"); }

// ─── Access token (RS256, short-lived) ───────────────────────────
export function signAccessToken(payload) {
  return jwt.sign(payload, getPrivateKey(), {
    algorithm: "RS256",
    expiresIn: process.env.JWT_ACCESS_EXPIRES || "15m",
    issuer: "codeforge-oj",
    audience: "codeforge-client",
  });
}

export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, getPublicKey(), {
      algorithms: ["RS256"],
      issuer: "codeforge-oj",
      audience: "codeforge-client",
    });
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      throw new AppError("Access token expired", 401, "TOKEN_EXPIRED");
    }
    throw new AppError("Invalid token", 401, "INVALID_TOKEN");
  }
}

// ─── Refresh token (opaque random bytes, stored hashed) ──────────
export function generateRefreshToken() {
  // 256-bit cryptographically random token
  return crypto.randomBytes(32).toString("hex");
}

export function hashRefreshToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// ─── Access token payload builder ────────────────────────────────
export function buildAccessTokenPayload(user) {
  return {
    sub: user._id.toString(),
    username: user.username,
    email: user.email,
    role: user.role,
  };
}

// ─── Device fingerprint ───────────────────────────────────────────
// Stable identifier per browser session derived from User-Agent.
// Not for security — only for "active sessions" display.
export function deriveDeviceId(userAgent = "", ipAddress = "") {
  return crypto
    .createHash("sha256")
    .update(`${userAgent}:${ipAddress}`)
    .digest("hex")
    .slice(0, 16);
}
