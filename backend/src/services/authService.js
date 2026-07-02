import User from "../models/User.js";
import RefreshToken from "../models/RefreshToken.js";
import {
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  buildAccessTokenPayload,
  deriveDeviceId,
} from "../utils/jwt.js";
import { AppError, BadRequest, Unauthorized, Conflict } from "../middleware/errorHandler.js";
import logger from "../utils/logger.js";

const REFRESH_TOKEN_TTL_DAYS = parseInt(process.env.JWT_REFRESH_EXPIRES) || 7;

// ─── Helpers ──────────────────────────────────────────────────────
function refreshTokenExpiry() {
  const d = new Date();
  d.setDate(d.getDate() + REFRESH_TOKEN_TTL_DAYS);
  return d;
}

function buildCookieOptions() {
  return {
    httpOnly: true,                                       // no JS access
    secure: process.env.NODE_ENV === "production",        // HTTPS only in prod
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    maxAge: REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
    path: "/api/auth",                                    // scoped — not sent to /api/problems etc.
  };
}

// Issues a token pair and persists the refresh token record
async function issueTokenPair(user, req) {
  const accessToken = signAccessToken(buildAccessTokenPayload(user));
  const rawRefresh = generateRefreshToken();
  const hashedToken = hashRefreshToken(rawRefresh);

  const userAgent = req.headers["user-agent"] || "unknown";
  const ipAddress = req.ip || req.connection?.remoteAddress || "unknown";
  const deviceId = deriveDeviceId(userAgent, ipAddress);

  await RefreshToken.create({
    hashedToken,
    userId: user._id,
    deviceId,
    userAgent,
    ipAddress,
    expiresAt: refreshTokenExpiry(),
  });

  return { accessToken, rawRefresh };
}

// ─── Register ─────────────────────────────────────────────────────
export async function register(data, req) {
  const { username, email, password } = data;

  // Check uniqueness before hashing (faster fail)
  const [emailExists, usernameExists] = await Promise.all([
    User.findOne({ email: email.toLowerCase() }),
    User.findOne({ username }),
  ]);

  if (emailExists) throw Conflict("Email is already registered");
  if (usernameExists) throw Conflict("Username is already taken");

  const user = await User.create({
    username,
    email: email.toLowerCase(),
    passwordHash: password, // pre-save hook hashes this
  });

  logger.info(`New user registered: ${user.username} (${user.email})`);

  const { accessToken, rawRefresh } = await issueTokenPair(user, req);

  return {
    user: user.toPublicProfile(),
    accessToken,
    refreshToken: rawRefresh,
  };
}

// ─── Login ────────────────────────────────────────────────────────
export async function login(data, req) {
  const { email, password } = data;

  // Always select passwordHash for comparison (stripped by default)
  const user = await User.findByEmail(email);
  if (!user) {
    // Constant-time-ish response to prevent user enumeration
    throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
  }

  if (!user.isActive) {
    throw new AppError("Account is deactivated", 403, "ACCOUNT_DEACTIVATED");
  }

  if (user.isLocked) {
    throw new AppError(
      "Account temporarily locked due to too many failed attempts. Try again later.",
      423,
      "ACCOUNT_LOCKED"
    );
  }

  const isValid = await user.comparePassword(password);
  if (!isValid) {
    await user.incrementLoginAttempts();
    throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
  }

  // Reset failed attempts on success
  await user.resetLoginAttempts();

  logger.info(`User logged in: ${user.username}`);

  const { accessToken, rawRefresh } = await issueTokenPair(user, req);

  return {
    user: user.toPublicProfile(),
    accessToken,
    refreshToken: rawRefresh,
  };
}

// ─── Refresh ──────────────────────────────────────────────────────
export async function refresh(rawToken, req) {
  if (!rawToken) throw Unauthorized("Refresh token missing");

  const hashedToken = hashRefreshToken(rawToken);

  const tokenRecord = await RefreshToken.findOne({ hashedToken });

  if (!tokenRecord) throw Unauthorized("Invalid refresh token");
  if (tokenRecord.isUsed) {
    // Token reuse detected — possible token theft, revoke all for this user
    logger.warn(`Refresh token reuse detected for userId: ${tokenRecord.userId}`);
    await RefreshToken.revokeAllForUser(tokenRecord.userId);
    throw Unauthorized("Refresh token reuse detected — all sessions revoked");
  }
  if (tokenRecord.expiresAt < new Date()) {
    await tokenRecord.deleteOne();
    throw Unauthorized("Refresh token expired");
  }

  // Mark old token as used (soft-delete before issuing new one)
  await tokenRecord.updateOne({ isUsed: true, usedAt: new Date() });

  const user = await User.findById(tokenRecord.userId);
  if (!user || !user.isActive) throw Unauthorized("User not found or deactivated");

  // Issue fresh pair
  const { accessToken, rawRefresh } = await issueTokenPair(user, req);

  // Delete the now-used old token record
  await tokenRecord.deleteOne();

  return {
    user: user.toPublicProfile(),
    accessToken,
    refreshToken: rawRefresh,
  };
}

// ─── Logout ───────────────────────────────────────────────────────
export async function logout(rawToken) {
  if (!rawToken) return; // already logged out

  const hashedToken = hashRefreshToken(rawToken);
  await RefreshToken.deleteOne({ hashedToken });
  logger.info("User logged out — refresh token revoked");
}

// ─── Logout all devices ───────────────────────────────────────────
export async function logoutAll(userId) {
  await RefreshToken.revokeAllForUser(userId);
  logger.info(`All sessions revoked for userId: ${userId}`);
}

// ─── Get current user (from access token) ────────────────────────
export async function getMe(userId) {
  const user = await User.findById(userId);
  if (!user || !user.isActive) throw Unauthorized("User not found");
  return user.toPublicProfile();
}

export default {
  register,
  login,
  refresh,
  logout,
  logoutAll,
  getMe,
  buildCookieOptions,
};
