import fetch from "node-fetch";
import { getRedis } from "../config/redis.js";
import {
  AI_MODELS, DAILY_LIMITS, OPENROUTER_BASE_URL, getModelForFeature, FALLBACK_CHAIN,
} from "../config/aiModels.js";
import {
  SYSTEM_PROMPTS,
  buildHintPrompt, buildComplexityPrompt, buildReviewPrompt,
  buildExplainPrompt, buildDebugPrompt, buildOptimalPrompt,
  buildLearningPathPrompt, buildChatPrompt, buildChatHistory,
} from "../config/aiPrompts.js";
import Problem from "../models/Problem.js";
import { AppError } from "../middleware/errorHandler.js";
import logger from "../utils/logger.js";

// ─── Rate limiting via Redis ──────────────────────────────────────
async function checkAndIncrementUsage(userId, userRole) {
  const redis  = getRedis();
  const today  = new Date().toISOString().slice(0, 10); // "2026-07-05"
  const key    = `ai:usage:${userId}:${today}`;
  const limit  = DAILY_LIMITS[userRole] ?? DAILY_LIMITS.user;

  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, 86_400); // TTL = 24h
  }

  if (current > limit) {
    throw new AppError(
      `Daily AI limit reached (${limit} requests/day). Upgrade to premium for higher limits.`,
      429, "AI_RATE_LIMITED"
    );
  }

  return { used: current, limit };
}

// ─── Log AI usage to MongoDB ─────────────────────────────────────
async function logAiUsage({ userId, problemId, feature, model, tokensUsed }) {
  try {
    const { default: mongoose } = await import("mongoose");
    const AiLog = mongoose.models.AiLog || mongoose.model("AiLog",
      new mongoose.Schema({
        userId: mongoose.Schema.Types.ObjectId,
        problemId: mongoose.Schema.Types.ObjectId,
        feature: String,
        model: String,
        tokensUsed: Number,
        createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 30 },
      })
    );
    await AiLog.create({ userId, problemId, feature, model, tokensUsed });
  } catch {
    // Non-fatal — don't crash on logging failure
  }
}

// ─── Core OpenRouter SSE call ─────────────────────────────────────
async function* streamFromOpenRouter({ model, systemPrompt, messages, maxTokens }) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new AppError("OpenRouter API key not configured", 500, "AI_NOT_CONFIGURED");

  const body = JSON.stringify({
    model,
    max_tokens: maxTokens || 2048,
    stream: true,
    messages: [
      { role: "system", content: systemPrompt },
      ...messages,
    ],
  });

  let response;
  try {
    response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method:  "POST",
      headers: {
        "Authorization":    `Bearer ${apiKey}`,
        "Content-Type":     "application/json",
        "HTTP-Referer":     "https://codeforge.dev",
        "X-Title":          "CodeForge OJ",
      },
      body,
    });
  } catch (err) {
    throw new AppError(`OpenRouter unreachable: ${err.message}`, 503, "AI_UNAVAILABLE");
  }

  // Handle 429 — rate limited, rotate to next model
  if (response.status === 429) {
    throw new AppError("OpenRouter rate limit hit", 429, "AI_RATE_LIMITED");
  }

  // Handle 404 — model no longer available for free, skip to next
  if (response.status === 404) {
    const errText = await response.text().catch(() => "");
    throw new AppError(`Model unavailable: ${model}`, 404, "AI_MODEL_UNAVAILABLE");
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => "(could not read body)");
    const msg = `OpenRouter error ${response.status} for model ${model}: ${errText}`;
    logger.error(msg);
    throw new AppError(msg, 502, "AI_ERROR");
  }

  // Parse SSE stream
  const decoder = new TextDecoder();
  for await (const chunk of response.body) {
    const text = decoder.decode(chunk, { stream: true });
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === "data: [DONE]") continue;
      if (!trimmed.startsWith("data: ")) continue;

      try {
        const json  = JSON.parse(trimmed.slice(6));
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) yield delta;
      } catch {
        // skip malformed SSE chunk
      }
    }
  }
}

// ─── Stream AI response to HTTP response ─────────────────────────
async function streamToResponse({ res, feature, messages, systemPrompt, modelConfig, userId, problemId }) {
  // SSE headers
  res.setHeader("Content-Type",  "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection",    "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  let totalTokens = 0;
  let usedModel   = modelConfig.id;

  const send = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Find starting position in the fallback chain for this feature's preferred model
  const startIdx = FALLBACK_CHAIN.findIndex((m) => m.id === modelConfig.id);
  // If not found (shouldn't happen), start at 0
  const chainStart = startIdx >= 0 ? startIdx : 0;

  try {
    let succeeded = false;

    for (let i = chainStart; i < FALLBACK_CHAIN.length; i++) {
      const model = FALLBACK_CHAIN[i];
      usedModel = model.id;

      try {
        for await (const chunk of streamFromOpenRouter({
          model:        model.id,
          systemPrompt,
          messages,
          maxTokens:    model.maxTokens,
        })) {
          send({ type: "chunk", content: chunk });
          totalTokens += Math.ceil(chunk.length / 4);
        }
        succeeded = true;
        break; // Stream completed — stop chain
      } catch (err) {
        const isSkippable = (err.code === "AI_RATE_LIMITED" || err.code === "AI_MODEL_UNAVAILABLE");
        if (isSkippable && i < FALLBACK_CHAIN.length - 1) {
          logger.warn(`Model ${model.id} unavailable for ${feature} (${err.code}), trying next model…`);
          continue; // Try next model in chain
        }
        throw err; // Fatal error or chain exhausted — re-throw
      }
    }

    if (succeeded) {
      send({ type: "done", model: usedModel, tokensUsed: totalTokens });
    }

  } catch (err) {
    const errMsg = err.message || err.code || String(err) || "Unknown AI error";
    logger.error(`AI stream error (${feature}): ${errMsg}`, { code: err.code, status: err.statusCode });
    send({ type: "error", message: errMsg });
  } finally {
    logAiUsage({ userId, problemId, feature, model: usedModel, tokensUsed: totalTokens }).catch(() => {});
    res.end();
  }
}

// ─── Feature handlers ─────────────────────────────────────────────
async function getProblemContext(problemId) {
  const problem = await Problem.findById(problemId).select(
    "title difficulty description constraints tags"
  );
  if (!problem) throw new AppError("Problem not found", 404, "NOT_FOUND");
  return problem;
}

export async function handleHint(req, res) {
  const { problemId, code, language, hintLevel = 1, verdict } = req.body;
  const { sub: userId, role: userRole } = req.user;

  await checkAndIncrementUsage(userId, userRole);
  const problem = await getProblemContext(problemId);
  const model   = getModelForFeature("hint");

  await streamToResponse({
    res,
    feature:      "hint",
    systemPrompt: SYSTEM_PROMPTS.hint,
    messages: [{ role: "user", content: buildHintPrompt({ problem, code, language, hintLevel, verdict }) }],
    modelConfig:  model,
    userId, problemId,
  });
}

export async function handleComplexity(req, res) {
  const { code, language } = req.body;
  const { sub: userId, role: userRole } = req.user;

  await checkAndIncrementUsage(userId, userRole);
  const model = getModelForFeature("complexity");

  await streamToResponse({
    res,
    feature:      "complexity",
    systemPrompt: SYSTEM_PROMPTS.complexity,
    messages: [{ role: "user", content: buildComplexityPrompt({ code, language }) }],
    modelConfig:  model,
    userId, problemId: null,
  });
}

export async function handleReview(req, res) {
  const { problemId, code, language, verdict } = req.body;
  const { sub: userId, role: userRole } = req.user;

  await checkAndIncrementUsage(userId, userRole);
  const problem = await getProblemContext(problemId);
  const model   = getModelForFeature("review");

  await streamToResponse({
    res,
    feature:      "review",
    systemPrompt: SYSTEM_PROMPTS.review,
    messages: [{ role: "user", content: buildReviewPrompt({ problem, code, language, verdict }) }],
    modelConfig:  model,
    userId, problemId,
  });
}

export async function handleExplain(req, res) {
  const { code, language } = req.body;
  const { sub: userId, role: userRole } = req.user;

  await checkAndIncrementUsage(userId, userRole);
  const model = getModelForFeature("explain");

  await streamToResponse({
    res,
    feature:      "explain",
    systemPrompt: SYSTEM_PROMPTS.explain,
    messages: [{ role: "user", content: buildExplainPrompt({ code, language }) }],
    modelConfig:  model,
    userId, problemId: null,
  });
}

export async function handleDebug(req, res) {
  const { problemId, code, language, verdict, failedTestIndex } = req.body;
  const { sub: userId, role: userRole } = req.user;

  await checkAndIncrementUsage(userId, userRole);
  const problem = await getProblemContext(problemId);
  const model   = getModelForFeature("debug");

  await streamToResponse({
    res,
    feature:      "debug",
    systemPrompt: SYSTEM_PROMPTS.debug,
    messages: [{ role: "user", content: buildDebugPrompt({ problem, code, language, verdict, failedTestIndex }) }],
    modelConfig:  model,
    userId, problemId,
  });
}

export async function handleOptimal(req, res) {
  const { problemId, code, language } = req.body;
  const { sub: userId, role: userRole } = req.user;

  await checkAndIncrementUsage(userId, userRole);
  const problem = await getProblemContext(problemId);
  const model   = getModelForFeature("optimal");

  await streamToResponse({
    res,
    feature:      "optimal",
    systemPrompt: SYSTEM_PROMPTS.optimal,
    messages: [{ role: "user", content: buildOptimalPrompt({ problem, code, language }) }],
    modelConfig:  model,
    userId, problemId,
  });
}

export async function handleLearningPath(req, res) {
  const { problemId, code, language, verdict } = req.body;
  const { sub: userId, role: userRole } = req.user;

  await checkAndIncrementUsage(userId, userRole);
  const problem = await getProblemContext(problemId);
  const model   = getModelForFeature("learning_path");

  await streamToResponse({
    res,
    feature:      "learning_path",
    systemPrompt: SYSTEM_PROMPTS.learning_path,
    messages: [{ role: "user", content: buildLearningPathPrompt({ problem, code, language, verdict }) }],
    modelConfig:  model,
    userId, problemId,
  });
}

export async function handleChat(req, res) {
  const { problemId, message, history = [] } = req.body;
  const { sub: userId, role: userRole } = req.user;

  await checkAndIncrementUsage(userId, userRole);
  const problem = problemId ? await getProblemContext(problemId).catch(() => null) : null;
  const model   = getModelForFeature("chat");

  const messages = [
    ...buildChatHistory(history),
    { role: "user", content: buildChatPrompt({ problem, message, chatHistory: history }) },
  ];

  await streamToResponse({
    res,
    feature:      "chat",
    systemPrompt: SYSTEM_PROMPTS.chat,
    messages,
    modelConfig:  model,
    userId, problemId,
  });
}

export async function getUsageStats(userId, userRole) {
  const redis  = getRedis();
  const today  = new Date().toISOString().slice(0, 10);
  const key    = `ai:usage:${userId}:${today}`;
  const used   = parseInt(await redis.get(key) || "0");
  const limit  = DAILY_LIMITS[userRole] ?? DAILY_LIMITS.user;
  return { used, limit, remaining: Math.max(0, limit - used) };
}
