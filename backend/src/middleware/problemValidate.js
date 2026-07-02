import { body, query, param } from "express-validator";
import { validate } from "./validate.js";

// ─── List query params ────────────────────────────────────────────
export const listProblemsValidators = [
  query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
  query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be 1–100"),
  query("difficulty")
    .optional()
    .isIn(["easy", "medium", "hard"])
    .withMessage("Difficulty must be easy, medium, or hard"),
  query("search").optional().isString().trim().isLength({ max: 100 }),
  validate,
];

// ─── Create / Update validators ───────────────────────────────────
export const createProblemValidators = [
  body("title")
    .trim()
    .notEmpty().withMessage("Title is required")
    .isLength({ max: 200 }).withMessage("Title must be at most 200 characters"),

  body("difficulty")
    .notEmpty().withMessage("Difficulty is required")
    .isIn(["easy", "medium", "hard"]).withMessage("Difficulty must be easy, medium, or hard"),

  body("description")
    .trim()
    .notEmpty().withMessage("Description is required"),

  body("tags")
    .optional()
    .isArray().withMessage("Tags must be an array"),

  body("tags.*")
    .optional()
    .isString().trim().isLength({ min: 1, max: 30 })
    .withMessage("Each tag must be 1–30 characters"),

  body("timeLimit")
    .optional()
    .isInt({ min: 100, max: 10000 })
    .withMessage("Time limit must be 100–10000ms"),

  body("memoryLimit")
    .optional()
    .isInt({ min: 16, max: 1024 })
    .withMessage("Memory limit must be 16–1024MB"),

  body("testCases")
    .optional()
    .isArray().withMessage("Test cases must be an array"),

  body("testCases.*.input")
    .optional()
    .isString().withMessage("Test case input must be a string"),

  body("testCases.*.expectedOutput")
    .optional()
    .isString().withMessage("Test case expectedOutput must be a string"),

  body("examples")
    .optional()
    .isArray().withMessage("Examples must be an array"),

  body("allowedLanguages")
    .optional()
    .isArray().withMessage("allowedLanguages must be an array"),

  body("slug")
    .optional()
    .trim()
    .matches(/^[a-z0-9-]+$/)
    .withMessage("Slug may only contain lowercase letters, numbers, and hyphens"),

  validate,
];

export const updateProblemValidators = [
  param("id").isMongoId().withMessage("Invalid problem ID"),
  // All fields optional on update
  body("title").optional().trim().isLength({ max: 200 }),
  body("difficulty").optional().isIn(["easy", "medium", "hard"]),
  body("description").optional().trim().notEmpty(),
  body("tags").optional().isArray(),
  body("timeLimit").optional().isInt({ min: 100, max: 10000 }),
  body("memoryLimit").optional().isInt({ min: 16, max: 1024 }),
  body("testCases").optional().isArray(),
  body("examples").optional().isArray(),
  body("isPublished").optional().isBoolean(),
  body("isPremium").optional().isBoolean(),
  validate,
];
