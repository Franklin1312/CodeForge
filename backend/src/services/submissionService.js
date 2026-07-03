import Submission, { VERDICTS } from "../models/Submission.js";
import Problem from "../models/Problem.js";
import { getJudgeQueue, JOB_PRIORITY } from "../config/queue.js";
import { pushVerdictUpdate } from "../config/websocket.js";
import { updateProblemStats } from "./problemService.js";
import { NotFound, BadRequest, Forbidden } from "../middleware/errorHandler.js";
import logger from "../utils/logger.js";

// ─── Submit code ──────────────────────────────────────────────────
export async function createSubmission({ userId, problemId, language, code, userRole }) {
  // Validate problem exists and is published
  const problem = await Problem.findOne({ _id: problemId, isPublished: true });
  if (!problem) throw NotFound("Problem not found");

  // Check language is allowed
  if (!problem.allowedLanguages.includes(language)) {
    throw BadRequest(`Language '${language}' is not allowed for this problem`);
  }

  // Enforce code length limit (64 KB)
  if (code.length > 65_536) {
    throw BadRequest("Code exceeds maximum length of 64 KB");
  }

  // Rate-limit: max 5 pending/running submissions per user
  const inFlight = await Submission.countDocuments({
    userId,
    verdict: { $in: [VERDICTS.PENDING, VERDICTS.RUNNING] },
  });
  if (inFlight >= 5) {
    throw BadRequest("Too many submissions in queue. Please wait for existing submissions to complete.");
  }

  // Create submission record
  const submission = new Submission({
    userId,
    problemId:   problem._id,
    problemSlug: problem.slug,
    language,
    verdict:     VERDICTS.PENDING,
  });
  await submission.setCode(code);
  await submission.save();

  // Enqueue judge job
  const queue    = getJudgeQueue();
  const priority = JOB_PRIORITY[userRole] ?? JOB_PRIORITY.user;

  const job = await queue.add(
    {
      submissionId: submission._id.toString(),
      code,
      language,
      testCases:   problem.testCases,
      timeLimit:   problem.timeLimit,
      memoryLimit: problem.memoryLimit,
      problemId:   problem._id.toString(),
      userId:      userId.toString(),
    },
    { priority }
  );

  // Store Bull job ID for polling fallback
  submission.jobId = job.id.toString();
  await submission.save();

  logger.info(`Submission queued: ${submission._id} (job ${job.id}) for problem ${problem.slug}`);

  return {
    submissionId: submission._id,
    jobId:        job.id,
    verdict:      VERDICTS.PENDING,
    problemSlug:  problem.slug,
  };
}

// ─── Get submission by ID ─────────────────────────────────────────
export async function getSubmission(submissionId, requestingUser) {
  const submission = await Submission.findById(submissionId)
    .populate("userId",    "username avatar")
    .populate("problemId", "title slug difficulty");

  if (!submission) throw NotFound("Submission not found");

  // Only owner or admin can view
  if (
    submission.userId._id.toString() !== requestingUser.sub &&
    requestingUser.role !== "admin"
  ) {
    throw Forbidden("You can only view your own submissions");
  }

  // Attach decoded code
  const code = await submission.getCode();
  return { ...submission.toJSON(), code };
}

// ─── List submissions for current user ────────────────────────────
export async function getUserSubmissions({ userId, problemId, page = 1, limit = 20 }) {
  const query = { userId };
  if (problemId) query.problemId = problemId;

  const skip = (Math.max(1, page) - 1) * Math.min(50, limit);

  const [submissions, total] = await Promise.all([
    Submission.find(query)
      .select("-codeCompressed -testResults")
      .populate("problemId", "title slug difficulty")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Math.min(50, limit)),
    Submission.countDocuments(query),
  ]);

  return {
    submissions,
    pagination: {
      total, page: Number(page),
      totalPages: Math.ceil(total / limit),
      hasNext: skip + limit < total,
      hasPrev: Number(page) > 1,
    },
  };
}

// ─── Process a completed judge result (called by Bull worker) ─────
export async function finalizeSubmission(submissionId, judgeResult) {
  const submission = await Submission.findById(submissionId);
  if (!submission) {
    logger.error(`Submission ${submissionId} not found during finalization`);
    return;
  }

  Object.assign(submission, {
    verdict:      judgeResult.verdict,
    runtime:      judgeResult.runtime,
    memory:       judgeResult.memory,
    compileError: judgeResult.compileError,
    testResults:  judgeResult.testResults,
    judgeTimeMs:  judgeResult.judgeTimeMs,
  });

  await submission.save();

  // Update problem acceptance stats
  await updateProblemStats(
    submission.problemId,
    judgeResult.verdict === "AC"
  );

  // Push real-time update via WebSocket
  pushVerdictUpdate(submissionId, {
    submissionId,
    verdict:     judgeResult.verdict,
    runtime:     judgeResult.runtime,
    memory:      judgeResult.memory,
    testResults: judgeResult.testResults,
    compileError:judgeResult.compileError,
  });

  logger.info(`Submission finalized: ${submissionId} → ${judgeResult.verdict} (${judgeResult.runtime}ms)`);
}

export default { createSubmission, getSubmission, getUserSubmissions, finalizeSubmission };
