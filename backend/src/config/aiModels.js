/**
 * AI Model Registry — OpenRouter free models (verified working)
 *
 * Models are tried in FALLBACK_CHAIN order when rate-limited (429).
 * The chain ends with openrouter/auto which lets OpenRouter pick
 * any available free model automatically.
 */

export const AI_MODELS = {
  primary: {
    id:            "qwen/qwen3-coder:free",
    label:         "Qwen3 Coder",
    contextWindow: 1_000_000,
    maxTokens:     4096,
  },
  fast: {
    id:            "google/gemma-3-12b-it:free",
    label:         "Gemma 3 12B",
    contextWindow: 131_072,
    maxTokens:     2048,
  },
  deep: {
    id:            "deepseek/deepseek-r1:free",
    label:         "DeepSeek R1",
    contextWindow: 164_000,
    maxTokens:     8192,
  },
  fallback: {
    id:            "meta-llama/llama-3.3-70b-instruct:free",
    label:         "Llama 3.3 70B",
    contextWindow: 128_000,
    maxTokens:     4096,
  },
  fallback2: {
    id:            "google/gemma-3-27b-it:free",
    label:         "Gemma 3 27B",
    contextWindow: 131_072,
    maxTokens:     4096,
  },
  fallback3: {
    id:            "mistralai/mistral-7b-instruct:free",
    label:         "Mistral 7B",
    contextWindow: 32_768,
    maxTokens:     4096,
  },
  auto: {
    id:            "openrouter/auto",
    label:         "Auto (any free model)",
    contextWindow: 128_000,
    maxTokens:     4096,
  },
};

// Feature → preferred starting model
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

// Ordered fallback chain — tried in sequence on 429
// Each feature starts at its preferred model index in this chain
export const FALLBACK_CHAIN = [
  AI_MODELS.primary,
  AI_MODELS.fast,
  AI_MODELS.deep,
  AI_MODELS.fallback,
  AI_MODELS.fallback2,
  AI_MODELS.fallback3,
  AI_MODELS.auto,
];

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
