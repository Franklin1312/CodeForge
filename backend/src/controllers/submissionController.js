import submissionService from "../services/submissionService.js";
import { judgeSubmission } from "../workers/judgeDispatcher.js";

// ─── POST /api/submissions ────────────────────────────────────────
export async function createSubmissionController(req, res, next) {
  try {
    const { problemId, language, code } = req.body;
    const result = await submissionService.createSubmission({
      userId:    req.user.sub,
      problemId,
      language,
      code,
      userRole:  req.user.role,
    });
    return res.status(202).json({
      message: "Submission queued",
      ...result,
    });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/submissions/run ────────────────────────────────────
// Run code against custom stdin without saving to DB.
export async function runCodeController(req, res, next) {
  try {
    const { language, code, stdin = "" } = req.body;

    const CUSTOM_RUN_MARKER = "\x00__CUSTOM_RUN__";

    const result = await judgeSubmission({
      code,
      language,
      testCases:   [{ input: stdin, expectedOutput: CUSTOM_RUN_MARKER, isHidden: false }],
      timeLimit:   5000,   // generous 5s for custom runs
      memoryLimit: 256,
    });

    const tc = result.testResults?.[0] || {};

    // For custom runs there's no "expected output", so WA just means "ran OK"
    const verdict = result.verdict === "WA" ? "OK" : result.verdict;

    return res.json({
      stdout:       tc.actual        || "",
      stderr:       result.compileError || "",
      verdict,
      runtime:      tc.runtime  ?? result.runtime,
      compileError: result.compileError || null,
    });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/submissions/:id ─────────────────────────────────────
export async function getSubmissionController(req, res, next) {
  try {
    const data = await submissionService.getSubmission(req.params.id, req.user);
    return res.json({ submission: data });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/submissions/me ──────────────────────────────────────
export async function mySubmissionsController(req, res, next) {
  try {
    const { problemId, page, limit } = req.query;
    const data = await submissionService.getUserSubmissions({
      userId:    req.user.sub,
      problemId: problemId || null,
      page:      parseInt(page)  || 1,
      limit:     parseInt(limit) || 20,
    });
    return res.json(data);
  } catch (err) {
    next(err);
  }
}
