import authService from "../services/authService.js";
import logger from "../utils/logger.js";

// Cookie name constant — keep in sync with frontend interceptor
export const REFRESH_COOKIE = "codeforge_refresh";

// ─── POST /api/auth/register ──────────────────────────────────────
export async function registerController(req, res, next) {
  try {
    const { user, accessToken, refreshToken } = await authService.register(req.body, req);

    res.cookie(REFRESH_COOKIE, refreshToken, authService.buildCookieOptions());

    return res.status(201).json({
      message: "Registration successful",
      user,
      accessToken,
    });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/auth/login ─────────────────────────────────────────
export async function loginController(req, res, next) {
  try {
    const { user, accessToken, refreshToken } = await authService.login(req.body, req);

    res.cookie(REFRESH_COOKIE, refreshToken, authService.buildCookieOptions());

    return res.status(200).json({
      message: "Login successful",
      user,
      accessToken,
    });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/auth/refresh ───────────────────────────────────────
export async function refreshController(req, res, next) {
  try {
    const rawToken = req.cookies[REFRESH_COOKIE];
    const { user, accessToken, refreshToken } = await authService.refresh(rawToken, req);

    res.cookie(REFRESH_COOKIE, refreshToken, authService.buildCookieOptions());

    return res.status(200).json({
      message: "Token refreshed",
      user,
      accessToken,
    });
  } catch (err) {
    next(err);
  }
}

// ─── DELETE /api/auth/logout ──────────────────────────────────────
export async function logoutController(req, res, next) {
  try {
    const rawToken = req.cookies[REFRESH_COOKIE];
    await authService.logout(rawToken);

    // Clear the cookie regardless
    res.clearCookie(REFRESH_COOKIE, { path: "/api/auth" });

    return res.status(200).json({ message: "Logged out successfully" });
  } catch (err) {
    next(err);
  }
}

// ─── DELETE /api/auth/logout-all ─────────────────────────────────
export async function logoutAllController(req, res, next) {
  try {
    await authService.logoutAll(req.user.sub);
    res.clearCookie(REFRESH_COOKIE, { path: "/api/auth" });
    return res.status(200).json({ message: "All sessions revoked" });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/auth/me ────────────────────────────────────────────
export async function getMeController(req, res, next) {
  try {
    const user = await authService.getMe(req.user.sub);
    return res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
}
