import { Router } from "express";
import {
  registerController,
  loginController,
  refreshController,
  logoutController,
  logoutAllController,
  getMeController,
} from "../controllers/authController.js";
import { registerValidators, loginValidators } from "../middleware/validate.js";
import { authenticate } from "../middleware/auth.js";
import { loginLimiter, registerLimiter, refreshLimiter } from "../middleware/authLimiter.js";

const router = Router();

// ─── Public routes ────────────────────────────────────────────────

// POST /api/auth/register
// Body: { username, email, password }
// Returns: { user, accessToken } + sets httpOnly refresh cookie
router.post(
  "/register",
  registerLimiter,
  registerValidators,
  registerController
);

// POST /api/auth/login
// Body: { email, password }
// Returns: { user, accessToken } + sets httpOnly refresh cookie
router.post(
  "/login",
  loginLimiter,
  loginValidators,
  loginController
);

// POST /api/auth/refresh
// Cookie: codeforge_refresh (httpOnly)
// Returns: { user, accessToken } + rotated refresh cookie
router.post(
  "/refresh",
  refreshLimiter,
  refreshController
);

// ─── Protected routes ─────────────────────────────────────────────

// GET /api/auth/me
// Returns the current authenticated user's profile
router.get("/me", authenticate, getMeController);

// DELETE /api/auth/logout
// Revokes the current session's refresh token + clears cookie
router.delete("/logout", logoutController);

// DELETE /api/auth/logout-all
// Revokes ALL refresh tokens for the user (sign out all devices)
router.delete("/logout-all", authenticate, logoutAllController);

export default router;
