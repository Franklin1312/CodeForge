import { verifyAccessToken } from "../utils/jwt.js";
import { Unauthorized, Forbidden } from "../middleware/errorHandler.js";

// ─── authenticate ─────────────────────────────────────────────────
// Verifies the Bearer token and attaches the decoded payload to req.user.
// Throws 401 if missing or invalid.
export function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      throw Unauthorized("Authorization header missing or malformed");
    }

    const token = authHeader.slice(7); // strip "Bearer "
    const payload = verifyAccessToken(token);

    req.user = payload; // { sub, username, email, role, iat, exp }
    next();
  } catch (err) {
    next(err);
  }
}

// ─── optionalAuth ─────────────────────────────────────────────────
// Like authenticate but doesn't throw if no token is present.
// Use on routes that are public but behave differently when logged in
// (e.g. problem list showing "solved" badge).
export function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      req.user = verifyAccessToken(token);
    }
  } catch {
    // Silently ignore invalid tokens on optional auth
    req.user = null;
  }
  next();
}

// ─── requireRole ──────────────────────────────────────────────────
// Factory — returns middleware that checks req.user.role.
// Use after authenticate.
//
// Example:
//   router.post("/problems", authenticate, requireRole("admin"), createProblem);
//   router.get("/premium", authenticate, requireRole("premium", "admin"), handler);
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(Unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(Forbidden(`Requires role: ${roles.join(" or ")}`));
    }
    next();
  };
}

// ─── requireOwnerOrAdmin ──────────────────────────────────────────
// Ensures req.user.sub === targetUserId OR user is admin.
// Pass the target user ID from req.params.
//
// Example:
//   router.patch("/:id", authenticate, requireOwnerOrAdmin("id"), updateUser);
export function requireOwnerOrAdmin(paramName = "id") {
  return (req, res, next) => {
    if (!req.user) return next(Unauthorized());
    const targetId = req.params[paramName];
    if (req.user.sub !== targetId && req.user.role !== "admin") {
      return next(Forbidden("You can only modify your own resources"));
    }
    next();
  };
}
