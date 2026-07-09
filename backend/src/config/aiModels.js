/**
 * AI Model Registry — OpenRouter free models (July 2026)
 *
 * Primary:  qwen/qwen3-coder:free  — best free coding model, 1M context
 * Fast:     cohere/north-mini-code:free — fastest (69 tok/s), great for quick hints
 * Deep:     openai/gpt-oss-120b:free — deepest reasoning, complex analysis
 * Fallback: meta-llama/llama-3.3-70b:free — reliable, always available
 *
 * Rate limits (free tier): 20 req/min, 200 req/day across ALL free models.
 * Our per-user daily cap prevents hitting OpenRouter's limits.
 */

export const AI_MODELS = {
  // Best overall free coder — used for hints, review, editorial
  primary: {
    id:          "qwen/qwen3-coder:free",
    label:       "Qwen3 Coder",
    contextWindow: 1_000_000,
    maxTokens:   4096,
    bestFor:     ["hint", "review", "explain", "editorial"],
  },

  // Fastest — used for quick complexity analysis and short responses
  fast: {
    id:          "cohere/north-mini-code:free",
    label:       "North Mini Code",
    contextWindow: 256_000,
    maxTokens:   2048,
    bestFor:     ["complexity", "quick_hint"],
  },

  // Deepest reasoning — used for post-solve optimal solution
  deep: {
    id:          "openai/gpt-oss-120b:free",
    label:       "GPT-OSS 120B",
    contextWindow: 128_000,
    maxTokens:   8192,
    bestFor:     ["optimal", "debug", "learning_path"],
  },

  // Always-on fallback — rotate to if primary returns 429/503
  fallback: {
    id:          "meta-llama/llama-3.3-70b:free",
    label:       "Llama 3.3 70B",
    contextWindow: 128_000,
    maxTokens:   4096,
    bestFor:     ["fallback"],
  },
};

// Feature → model mapping
export const FEATURE_MODEL_MAP = {
  hint:          "primary",
  complexity:    "fast",
  review:        "primary",
  explain:       "primary",
  debug:         "deep",
  optimal:       "deep",
  learning_path: "deep",
  quick_hint:    "fast",
  chat:          "primary",
};

export function getModelForFeature(feature) {
  const key = FEATURE_MODEL_MAP[feature] || "primary";
  return AI_MODELS[key];
}

export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

// Per-user daily request caps (enforced in Redis)
export const DAILY_LIMITS = {
  user:    30,   // generous for free users within OpenRouter's 200/day
  premium: 100,
  admin:   500,
};
