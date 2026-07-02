import logger from "../utils/logger.js";

// Normalized error response shape — every error from the API looks like:
// { error: { code, message, details? } }

export function errorHandler(err, req, res, next) {
  // Log the error with request context
  logger.error(`${req.method} ${req.url} — ${err.message}`, {
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    statusCode: err.statusCode,
  });

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "Request validation failed", details },
    });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({
      error: { code: "DUPLICATE_KEY", message: `${field} already exists` },
    });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      error: { code: "INVALID_TOKEN", message: "Invalid or malformed token" },
    });
  }
  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      error: { code: "TOKEN_EXPIRED", message: "Token has expired" },
    });
  }

  // Custom app errors (thrown with err.statusCode)
  const statusCode = err.statusCode || 500;
  const code = err.code || "INTERNAL_ERROR";
  const message =
    statusCode === 500 && process.env.NODE_ENV === "production"
      ? "An unexpected error occurred"
      : err.message;

  return res.status(statusCode).json({
    error: { code, message, ...(err.details ? { details: err.details } : {}) },
  });
}

// AppError factory — use this to throw predictable errors
export class AppError extends Error {
  constructor(message, statusCode = 500, code = "INTERNAL_ERROR", details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.name = "AppError";
  }
}

// Shorthand factories
export const BadRequest = (msg, details) => new AppError(msg, 400, "BAD_REQUEST", details);
export const Unauthorized = (msg = "Unauthorized") => new AppError(msg, 401, "UNAUTHORIZED");
export const Forbidden = (msg = "Forbidden") => new AppError(msg, 403, "FORBIDDEN");
export const NotFound = (msg = "Resource not found") => new AppError(msg, 404, "NOT_FOUND");
export const Conflict = (msg) => new AppError(msg, 409, "CONFLICT");
export const TooManyRequests = (msg) => new AppError(msg, 429, "RATE_LIMITED");
