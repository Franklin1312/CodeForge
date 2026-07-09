import { Router } from "express";
import { body } from "express-validator";
import {
  hintController, complexityController, reviewController,
  explainController, debugController, optimalController,
  learningPathController, chatController, usageController,
} from "../controllers/aiController.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import rateLimit from "express-rate-limit";

const router = Router();

// All AI routes require auth
router.use(authenticate);

// Tighter rate limit at the HTTP layer (before hitting OpenRouter)
// Per-user daily cap is enforced in Redis inside aiService
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 15,
  keyGenerator: (req) => req.user?.sub || req.ip,
  message: { error: { code: "RATE_LIMITED", message: "Too many AI requests. Please slow down." } },
});

router.use(aiLimiter);

// ─── Shared validators ────────────────────────────────────────────
const codeValidators = [
  body("code").isString().trim().notEmpty().isLength({ max: 65536 }),
  body("language").isIn(["python", "javascript", "java", "cpp", "go", "rust"]),
  validate,
];

const problemCodeValidators = [
  body("problemId").isMongoId(),
  ...codeValidators,
];

// ─── Routes ──────────────────────────────────────────────────────

// GET /api/ai/usage — daily usage stats for current user
router.get("/usage", usageController);

// POST /api/ai/hint — staged hint (level 1–3)
router.post(
  "/hint",
  [
    body("problemId").isMongoId(),
    body("code").isString().trim().notEmpty().isLength({ max: 65536 }),
    body("language").isIn(["python", "javascript", "java", "cpp", "go", "rust"]),
    body("hintLevel").optional().isInt({ min: 1, max: 3 }),
    body("verdict").optional().isString(),
    validate,
  ],
  hintController
);

// POST /api/ai/complexity — Big-O analysis
router.post("/complexity", codeValidators, complexityController);

// POST /api/ai/review — code review
router.post(
  "/review",
  [
    body("problemId").isMongoId(),
    body("code").isString().trim().notEmpty().isLength({ max: 65536 }),
    body("language").isIn(["python", "javascript", "java", "cpp", "go", "rust"]),
    body("verdict").optional().isString(),
    validate,
  ],
  reviewController
);

// POST /api/ai/explain — explain code step by step
router.post("/explain", codeValidators, explainController);

// POST /api/ai/debug — help find a bug after WA/RE
router.post(
  "/debug",
  [
    body("problemId").isMongoId(),
    body("code").isString().trim().notEmpty().isLength({ max: 65536 }),
    body("language").isIn(["python", "javascript", "java", "cpp", "go", "rust"]),
    body("verdict").optional().isString(),
    body("failedTestIndex").optional().isInt({ min: 0 }),
    validate,
  ],
  debugController
);

// POST /api/ai/optimal — show optimal solution (post-solve)
router.post(
  "/optimal",
  [
    body("problemId").isMongoId(),
    body("code").isString().trim().notEmpty().isLength({ max: 65536 }),
    body("language").isIn(["python", "javascript", "java", "cpp", "go", "rust"]),
    validate,
  ],
  optimalController
);

// POST /api/ai/learning-path — what to study next
router.post(
  "/learning-path",
  [
    body("problemId").isMongoId(),
    body("code").isString().trim().notEmpty().isLength({ max: 65536 }),
    body("language").isIn(["python", "javascript", "java", "cpp", "go", "rust"]),
    body("verdict").optional().isString(),
    validate,
  ],
  learningPathController
);

// POST /api/ai/chat — free-form AI chat
router.post(
  "/chat",
  [
    body("message").isString().trim().notEmpty().isLength({ max: 2000 }),
    body("problemId").optional().isMongoId(),
    body("history").optional().isArray({ max: 20 }),
    validate,
  ],
  chatController
);

export default router;
