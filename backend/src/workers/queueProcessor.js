import { getJudgeQueue } from "../config/queue.js";
import { judgeSubmission } from "./judgeDispatcher.js";
import { finalizeSubmission } from "../services/submissionService.js";
import { pushVerdictUpdate } from "../config/websocket.js";
import Submission, { VERDICTS } from "../models/Submission.js";
import { pruneJudgeContainers } from "./imageManager.js";
import logger from "../utils/logger.js";

const CONCURRENCY = parseInt(process.env.JUDGE_WORKERS) || 2;
const PRUNE_INTERVAL = 10 * 60 * 1000;

export function startQueueProcessor() {
  const queue = getJudgeQueue();

  queue.process(CONCURRENCY, async (job) => {
    const { submissionId, code, language, testCases, timeLimit, memoryLimit } = job.data;
    const wallStart = Date.now();
    logger.info("Judge start: " + submissionId + " [" + language + "] job " + job.id);

    await Submission.findByIdAndUpdate(submissionId, { verdict: VERDICTS.RUNNING });
    pushVerdictUpdate(submissionId, { submissionId, verdict: VERDICTS.RUNNING });

    let judgeResult;
    try {
      judgeResult = await judgeSubmission({ code, language, testCases, timeLimit, memoryLimit });
    } catch (err) {
      logger.error("Judge threw for " + submissionId + ": " + err.message);
      judgeResult = { verdict: VERDICTS.SE, runtime: 0, memory: 0, compileError: null, testResults: [] };
    }

    judgeResult.judgeTimeMs = Date.now() - wallStart;
    await finalizeSubmission(submissionId, judgeResult);
    logger.info("Judge done: " + submissionId + " -> " + judgeResult.verdict + " (" + judgeResult.runtime + "ms)");
    return { verdict: judgeResult.verdict, runtime: judgeResult.runtime };
  });

  queue.on("failed", async (job, err) => {
    logger.error("Job " + job.id + " failed (" + job.attemptsMade + "/" + job.opts.attempts + "): " + err.message);
    if (job.attemptsMade >= job.opts.attempts) {
      const { submissionId } = job.data;
      try {
        await Submission.findByIdAndUpdate(submissionId, { verdict: VERDICTS.SE });
        pushVerdictUpdate(submissionId, { submissionId, verdict: VERDICTS.SE });
      } catch (e) {
        logger.error("Failed to mark SE: " + e.message);
      }
    }
  });

  queue.on("stalled", (job) => logger.warn("Job " + job.id + " stalled"));
  queue.on("error",   (err)  => logger.error("Queue error: " + err.message));

  setInterval(pruneJudgeContainers, PRUNE_INTERVAL);
  logger.info("Queue processor started (concurrency=" + CONCURRENCY + ")");
}

export default startQueueProcessor;
