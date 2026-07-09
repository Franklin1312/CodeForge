/**
 * Judge dispatcher — the single entry point for all code execution.
 *
 * Decision tree:
 *   1. JUDGE_MOCK=true in env → always use mock (useful for CI/testing)
 *   2. Docker available       → use real sandbox (production path)
 *   3. Docker unavailable     → fall back to mock with warning
 *
 * This file replaces the old judgeWorker.js used in Stage 5.
 */

import { isDockerAvailable } from "./imageManager.js";
import { runInSandbox }       from "./sandbox.js";
import { runMockJudge }       from "./mockJudge.js";
import logger from "../utils/logger.js";

let _dockerChecked = false;
let _dockerAvailable = false;

async function getJudgeMode() {
  // Explicit override
  if (process.env.JUDGE_MOCK === "true") return "mock";

  // Cache the Docker availability check (expensive)
  if (!_dockerChecked) {
    _dockerAvailable = await isDockerAvailable();
    _dockerChecked = true;
    logger.info(`Judge mode: ${_dockerAvailable ? "Docker sandbox" : "MOCK (Docker unavailable)"}`);
  }

  return _dockerAvailable ? "docker" : "mock";
}

/**
 * judgeSubmission — runs code against all test cases.
 *
 * @param {object} params
 * @param {string} params.code
 * @param {string} params.language
 * @param {Array}  params.testCases  — [{ input, expectedOutput, isHidden }]
 * @param {number} params.timeLimit  — ms
 * @param {number} params.memoryLimit — MB
 *
 * @returns {{ verdict, runtime, memory, compileError, testResults, _mock? }}
 */
export async function judgeSubmission(params) {
  const mode = await getJudgeMode();

  if (mode === "mock") {
    return runMockJudge(params);
  }

  try {
    return await runInSandbox(params);
  } catch (err) {
    // If Docker throws unexpectedly, fall back to SE verdict (don't crash worker)
    logger.error("Sandbox threw unexpectedly:", err.message);
    return {
      verdict:      "SE",
      runtime:      0,
      memory:       0,
      compileError: `System error: ${err.message}`,
      testResults:  (params.testCases || []).map((_, i) => ({
        testCaseIndex: i, verdict: "SE", runtime: 0, memory: 0,
        isHidden: params.testCases[i]?.isHidden ?? false,
      })),
    };
  }
}

export default judgeSubmission;
