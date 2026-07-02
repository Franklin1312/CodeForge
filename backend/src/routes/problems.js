import { Router } from "express";
import {
  listProblemsController,
  getTagsController,
  getProblemController,
  createProblemController,
  updateProblemController,
  deleteProblemController,
  togglePublishController,
  getAdminProblemController,
} from "../controllers/problemController.js";
import { authenticate, optionalAuth, requireRole } from "../middleware/auth.js";
import {
  listProblemsValidators,
  createProblemValidators,
  updateProblemValidators,
} from "../middleware/problemValidate.js";

const router = Router();

// ─── Public / optional-auth routes ───────────────────────────────

// GET /api/problems  — list with filters & pagination
// optionalAuth lets us show "solved" badge for logged-in users
router.get("/", optionalAuth, listProblemsValidators, listProblemsController);

// GET /api/problems/tags  — all available tags for filter UI
// Must be before /:slug so it doesn't match "tags" as a slug
router.get("/tags", getTagsController);

// GET /api/problems/:slug  — single problem detail
router.get("/:slug", optionalAuth, getProblemController);

// ─── Admin-only routes ────────────────────────────────────────────

// GET /api/problems/:id/admin  — full problem data including hidden test cases
router.get("/:id/admin", authenticate, requireRole("admin"), getAdminProblemController);

// POST /api/problems  — create new problem
router.post(
  "/",
  authenticate,
  requireRole("admin"),
  createProblemValidators,
  createProblemController
);

// PATCH /api/problems/:id  — partial update
router.patch(
  "/:id",
  authenticate,
  requireRole("admin"),
  updateProblemValidators,
  updateProblemController
);

// DELETE /api/problems/:id  — delete problem
router.delete("/:id", authenticate, requireRole("admin"), deleteProblemController);

// PATCH /api/problems/:id/publish  — toggle published state
router.patch(
  "/:id/publish",
  authenticate,
  requireRole("admin"),
  togglePublishController
);

export default router;
