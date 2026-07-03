import { getJudgeQueue } from "../config/queue.js";
import { judgeSubmission } from "./judgeWorker.js";
import { finalizeSubmission } from "../services/submissionService.js";
import { pushVerdictUpdate } from "../config/websocket.js";
import Submission from "../models/Submission.js";
import { VERDICTS } from "../models/Submission.js";
import logger from "../utils/logger.js";

const CONCURRENCY = parseInt(process.env.JUDGE_WORKERS) || 2;

export function startQueueProcessor() {
  const queue = getJudgeQueue();

  queue.process(CONCURRENCY, async (job) => {
    const {
      submissionId, code, language,
      testCases, timeLimit, memoryLimit,
    } = job.data;

    const startTime = Date.now();
    logger.info(`Judge started: submission ${submissionId} [${language}]`);

    // Mark as RUNNING immediately + push WS update
    await Submission.findByIdAndUpdate(submissionId, { verdict: VERDICTS.RUNNING });
    pushVerdictUpdate(submissionId, {
      submissionId,
      verdict: VERDICTS.RUNNING,
    });

    let judgeResult;
    try {
      judgeResult = await judgeSubmission({
        code,
        language,
        testCases,
        timeLimit,
        memoryLimit,
      });
    } catch (err) {
      logger.error(`Judge threw for submission ${submissionId}:`, err.message);
      judgeResult = {
        verdict:      VERDICTS.SE,
        runtime:      0,
        memory:       0,
        compileError: null,
        testResults:  [],
      };
    }

    judgeResult.judgeTimeMs = Date.now() - startTime;

    await finalizeSubmission(submissionId, judgeResult);

    logger.info(
      `Judge done: ${submissionId} → ${judgeResult.verdict} ` +
      `(${judgeResult.runtime}ms, wall: ${judgeResult.judgeTimeMs}ms)`
    );

    return judgeResult;
  });

  // ── Event hooks ──────────────────────────────────────────────
  queue.on("failed", async (job, err) => {
    logger.error(`Job ${job.id} failed (attempt ${job.attemptsMade}):`, err.message);

    // On final failure (no more retries), mark SE and push update
    if (job.attemptsMade >= job.opts.attempts) {
      const { submissionId } = job.data;
      await Submission.findByIdAndUpdate(submissionId, { verdict: VERDICTS.SE });
      pushVerdictUpdate(submissionId, {
        submissionId,
        verdict: VERDICTS.SE,
      });
    }
  });

  queue.on("completed", (job) => {
    logger.debug(`Job ${job.id} completed`);
  });

  queue.on("stalled", (job) => {
    logger.warn(`Job ${job.id} stalled — will retry`);
  });

  logger.info(`✅ Queue processor started (concurrency: ${CONCURRENCY})`);
}

export default startQueueProcessor;
