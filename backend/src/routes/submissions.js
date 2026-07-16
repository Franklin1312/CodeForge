import { Router } from "express";
import { body, query, param } from "express-validator";
import {
  createSubmissionController,
  getSubmissionController,
  mySubmissionsController,
  runCodeController,
} from "../controllers/submissionController.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import rateLimit from "express-rate-limit";

const router = Router();

// Tighter rate limit for submissions — prevent spam
const submitLimiter = rateLimit({
  windowMs: 60 * 1000,   // 1 minute
  max: 10,
  message: { error: { code: "RATE_LIMITED", message: "Too many submissions. Wait a moment." } },
  keyGenerator: (req) => req.user?.sub || req.ip,
});

// Slightly looser limit for custom run (no DB write, just execution)
const runLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: { code: "RATE_LIMITED", message: "Too many run requests. Wait a moment." } },
  keyGenerator: (req) => req.user?.sub || req.ip,
});

// All submission routes require auth
router.use(authenticate);

// POST /api/submissions/run — run with custom input (no DB save)
router.post(
  "/run",
  runLimiter,
  [
    body("language")
      .isIn(["python", "javascript", "java", "cpp", "go", "rust"])
      .withMessage("Unsupported language"),
    body("code")
      .isString().trim()
      .notEmpty().withMessage("Code is required")
      .isLength({ max: 65536 }).withMessage("Code must be under 64 KB"),
    body("stdin")
      .optional({ nullable: true })
      .isString()
      .isLength({ max: 4096 }).withMessage("Custom input must be under 4 KB"),
    validate,
  ],
  runCodeController
);

// POST /api/submissions
router.post(
  "/",
  submitLimiter,
  [
    body("problemId").isMongoId().withMessage("Invalid problem ID"),
    body("language")
      .isIn(["python", "javascript", "java", "cpp", "go", "rust"])
      .withMessage("Unsupported language"),
    body("code")
      .isString().trim()
      .notEmpty().withMessage("Code is required")
      .isLength({ max: 65536 }).withMessage("Code must be under 64 KB"),
    validate,
  ],
  createSubmissionController
);

// GET /api/submissions/me  (must come before /:id)
router.get(
  "/me",
  [
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 50 }),
    query("problemId").optional().isMongoId(),
    validate,
  ],
  mySubmissionsController
);

// GET /api/submissions/:id
router.get(
  "/:id",
  [param("id").isMongoId().withMessage("Invalid submission ID"), validate],
  getSubmissionController
);

export default router;
