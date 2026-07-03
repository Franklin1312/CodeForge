import submissionService from "../services/submissionService.js";

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
