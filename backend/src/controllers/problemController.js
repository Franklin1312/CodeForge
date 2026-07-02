import problemService from "../services/problemService.js";

// ─── GET /api/problems ────────────────────────────────────────────
export async function listProblemsController(req, res, next) {
  try {
    const { page, limit, difficulty, tags, search, isPremium } = req.query;
    const result = await problemService.listProblems({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      difficulty,
      tags,
      search,
      isPremium: isPremium === "true" ? true : isPremium === "false" ? false : undefined,
    });
    return res.json(result);
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/problems/tags ───────────────────────────────────────
export async function getTagsController(req, res, next) {
  try {
    const tags = await problemService.getAllTags();
    return res.json({ tags });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/problems/:slug ──────────────────────────────────────
export async function getProblemController(req, res, next) {
  try {
    const problem = await problemService.getProblemBySlug(req.params.slug, req.user || null);
    return res.json({ problem });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/problems (admin) ───────────────────────────────────
export async function createProblemController(req, res, next) {
  try {
    const problem = await problemService.createProblem(req.body, req.user);
    return res.status(201).json({ message: "Problem created", problem });
  } catch (err) {
    next(err);
  }
}

// ─── PATCH /api/problems/:id (admin) ─────────────────────────────
export async function updateProblemController(req, res, next) {
  try {
    const problem = await problemService.updateProblem(req.params.id, req.body, req.user);
    return res.json({ message: "Problem updated", problem });
  } catch (err) {
    next(err);
  }
}

// ─── DELETE /api/problems/:id (admin) ────────────────────────────
export async function deleteProblemController(req, res, next) {
  try {
    const result = await problemService.deleteProblem(req.params.id, req.user);
    return res.json(result);
  } catch (err) {
    next(err);
  }
}

// ─── PATCH /api/problems/:id/publish (admin) ─────────────────────
export async function togglePublishController(req, res, next) {
  try {
    const problem = await problemService.togglePublish(req.params.id, req.user);
    return res.json({
      message: `Problem ${problem.isPublished ? "published" : "unpublished"}`,
      problem,
    });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/problems/:id/admin — full detail for admin ─────────
export async function getAdminProblemController(req, res, next) {
  try {
    const problem = await problemService.getProblemById(req.params.id);
    return res.json({ problem });
  } catch (err) {
    next(err);
  }
}
