// Lightweight structured logger
// Outputs JSON in production, pretty-prints in development.
// No heavy dependencies — just native console with consistent shape.

const isDev = process.env.NODE_ENV !== "production";

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const currentLevel =
  LEVELS[process.env.LOG_LEVEL?.toLowerCase()] ?? (isDev ? LEVELS.debug : LEVELS.info);

function format(level, message, meta) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message: typeof message === "string" ? message : JSON.stringify(message),
    ...(meta && typeof meta === "object" ? meta : {}),
  };

  if (isDev) {
    const color = { error: "\x1b[31m", warn: "\x1b[33m", info: "\x1b[36m", debug: "\x1b[90m" };
    const reset = "\x1b[0m";
    return `${color[level]}[${level.toUpperCase()}]${reset} ${entry.timestamp} — ${entry.message}`;
  }

  return JSON.stringify(entry);
}

const logger = {
  error: (msg, meta) => {
    if (currentLevel >= LEVELS.error) console.error(format("error", msg, meta));
  },
  warn: (msg, meta) => {
    if (currentLevel >= LEVELS.warn) console.warn(format("warn", msg, meta));
  },
  info: (msg, meta) => {
    if (currentLevel >= LEVELS.info) console.log(format("info", msg, meta));
  },
  debug: (msg, meta) => {
    if (currentLevel >= LEVELS.debug) console.log(format("debug", msg, meta));
  },
};

export default logger;
