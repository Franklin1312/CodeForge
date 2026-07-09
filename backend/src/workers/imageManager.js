import { exec } from "child_process";
import { promisify } from "util";
import { LANGUAGES_BY_PULL_PRIORITY } from "./languageRegistry.js";
import logger from "../utils/logger.js";

const execAsync = promisify(exec);

// ─── State ────────────────────────────────────────────────────────
const imageStatus = new Map(); // image → "pending" | "ready" | "failed"

// ─── Check if Docker daemon is reachable ─────────────────────────
export async function isDockerAvailable() {
  try {
    await execAsync("docker info --format '{{.ServerVersion}}'", { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

// ─── Check if a specific image is already pulled ──────────────────
async function isImagePresent(image) {
  try {
    const { stdout } = await execAsync(`docker image inspect ${image} --format "{{.Id}}"`, { timeout: 5000 });
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

// ─── Pull a single image with retry ──────────────────────────────
async function pullImage(image, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      logger.info(`Pulling Docker image: ${image} (attempt ${attempt + 1})`);
      await execAsync(`docker pull ${image}`, { timeout: 5 * 60 * 1000 }); // 5 min
      imageStatus.set(image, "ready");
      logger.info(`✅ Image ready: ${image}`);
      return true;
    } catch (err) {
      logger.warn(`Failed to pull ${image}: ${err.message}`);
      if (attempt === retries) {
        imageStatus.set(image, "failed");
        return false;
      }
      // Wait 5s before retry
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

// ─── Prefetch all language images on startup ──────────────────────
// Runs in background — judge still works if some images aren't ready yet.
export async function prefetchImages() {
  const dockerOk = await isDockerAvailable();
  if (!dockerOk) {
    logger.warn("⚠️  Docker not available — judge will use mock mode");
    return;
  }

  logger.info("🐳 Starting Docker image prefetch...");

  for (const { lang, image } of LANGUAGES_BY_PULL_PRIORITY) {
    imageStatus.set(image, "pending");

    // Check local cache first
    const present = await isImagePresent(image);
    if (present) {
      imageStatus.set(image, "ready");
      logger.info(`✅ Image already present: ${image} (${lang})`);
      continue;
    }

    // Pull in background (don't await — let server start while pulling)
    pullImage(image).catch((err) =>
      logger.error(`Background pull failed for ${image}:`, err.message)
    );
  }
}

// ─── Ensure a specific image is ready before running ─────────────
export async function ensureImage(image) {
  const status = imageStatus.get(image);

  if (status === "ready") return true;
  if (status === "failed") return false;

  // If still pending or unknown, wait up to 3 minutes
  const deadline = Date.now() + 3 * 60 * 1000;
  while (Date.now() < deadline) {
    const s = imageStatus.get(image);
    if (s === "ready")  return true;
    if (s === "failed") return false;

    // Check directly if not in registry yet
    const present = await isImagePresent(image);
    if (present) {
      imageStatus.set(image, "ready");
      return true;
    }

    await new Promise((r) => setTimeout(r, 3000));
  }

  logger.error(`Timeout waiting for image: ${image}`);
  return false;
}

// ─── Get image pull status summary ───────────────────────────────
export function getImageStatusSummary() {
  return Object.fromEntries(imageStatus);
}

// ─── Clean up stopped/exited judge containers ─────────────────────
export async function pruneJudgeContainers() {
  try {
    await execAsync('docker container prune -f --filter "label=codeforge.judge=true"');
    logger.debug("Pruned stopped judge containers");
  } catch {
    // Non-fatal
  }
}
