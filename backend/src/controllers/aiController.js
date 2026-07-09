import {
  handleHint, handleComplexity, handleReview,
  handleExplain, handleDebug, handleOptimal,
  handleLearningPath, handleChat, getUsageStats,
} from "../services/aiService.js";
import logger from "../utils/logger.js";

// Each controller calls the service which sets SSE headers and streams.
// Errors inside the stream are sent as SSE error events (not HTTP errors).

function wrap(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res);
    } catch (err) {
      // If headers already sent (streaming started), we can't send HTTP error
      if (res.headersSent) {
        logger.error("AI error after headers sent:", err.message);
        res.end();
      } else {
        next(err);
      }
    }
  };
}

export const hintController          = wrap(handleHint);
export const complexityController    = wrap(handleComplexity);
export const reviewController        = wrap(handleReview);
export const explainController       = wrap(handleExplain);
export const debugController         = wrap(handleDebug);
export const optimalController       = wrap(handleOptimal);
export const learningPathController  = wrap(handleLearningPath);
export const chatController          = wrap(handleChat);

export async function usageController(req, res, next) {
  try {
    const stats = await getUsageStats(req.user.sub, req.user.role);
    return res.json({ usage: stats });
  } catch (err) {
    next(err);
  }
}
