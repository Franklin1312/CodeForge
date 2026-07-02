import Problem from "../models/Problem.js";
import { NotFound, BadRequest, Conflict } from "../middleware/errorHandler.js";
import logger from "../utils/logger.js";

// ─── Helpers ──────────────────────────────────────────────────────
function buildSlug(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// ─── List problems (public, paginated, filterable) ────────────────
export async function listProblems({ page = 1, limit = 20, difficulty, tags, search, isPremium } = {}) {
  const query = { isPublished: true };

  if (difficulty) query.difficulty = difficulty;
  if (tags) {
    const tagArr = Array.isArray(tags) ? tags : tags.split(",").map((t) => t.trim());
    query.tags = { $all: tagArr };
  }
  if (typeof isPremium === "boolean") query.isPremium = isPremium;
  if (search) {
    query.$text = { $search: search };
  }

  const skip = (Math.max(1, page) - 1) * Math.min(100, limit);
  const safeLimit = Math.min(100, limit);

  const [problems, total] = await Promise.all([
    Problem.find(query)
      .select("slug title difficulty tags stats isPublished isPremium createdAt")
      .sort(search ? { score: { $meta: "textScore" } } : { createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean(),
    Problem.countDocuments(query),
  ]);

  return {
    problems,
    pagination: {
      total,
      page: Number(page),
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
      hasNext: skip + safeLimit < total,
      hasPrev: Number(page) > 1,
    },
  };
}

// ─── Get single problem by slug ───────────────────────────────────
export async function getProblemBySlug(slug, user = null) {
  const problem = await Problem.findOne({ slug, isPublished: true }).populate(
    "createdBy",
    "username"
  );
  if (!problem) throw NotFound(`Problem '${slug}' not found`);
  return problem.toClientView(user);
}

// ─── Get problem by ID (admin use) ───────────────────────────────
export async function getProblemById(id) {
  const problem = await Problem.findById(id).populate("createdBy", "username");
  if (!problem) throw NotFound("Problem not found");
  return problem;
}

// ─── Create problem (admin only) ─────────────────────────────────
export async function createProblem(data, adminUser) {
  const slug = data.slug || buildSlug(data.title);

  // Check slug uniqueness
  const existing = await Problem.findOne({ slug });
  if (existing) throw Conflict(`A problem with slug '${slug}' already exists`);

  const problem = await Problem.create({
    ...data,
    slug,
    createdBy: adminUser.sub,
    updatedBy: adminUser.sub,
  });

  logger.info(`Problem created: ${problem.slug} by ${adminUser.username}`);
  return problem;
}

// ─── Update problem (admin only) ─────────────────────────────────
export async function updateProblem(id, data, adminUser) {
  const problem = await Problem.findById(id);
  if (!problem) throw NotFound("Problem not found");

  // If title changed and no explicit slug, regenerate slug
  if (data.title && data.title !== problem.title && !data.slug) {
    const newSlug = buildSlug(data.title);
    const existing = await Problem.findOne({ slug: newSlug, _id: { $ne: id } });
    if (existing) throw Conflict(`Slug '${newSlug}' is already taken`);
    data.slug = newSlug;
  }

  // If slug explicitly changed, check uniqueness
  if (data.slug && data.slug !== problem.slug) {
    const existing = await Problem.findOne({ slug: data.slug, _id: { $ne: id } });
    if (existing) throw Conflict(`Slug '${data.slug}' is already taken`);
  }

  Object.assign(problem, { ...data, updatedBy: adminUser.sub });
  await problem.save();

  logger.info(`Problem updated: ${problem.slug} by ${adminUser.username}`);
  return problem;
}

// ─── Delete problem (admin only) ─────────────────────────────────
export async function deleteProblem(id, adminUser) {
  const problem = await Problem.findById(id);
  if (!problem) throw NotFound("Problem not found");

  await problem.deleteOne();
  logger.info(`Problem deleted: ${problem.slug} by ${adminUser.username}`);
  return { message: `Problem '${problem.slug}' deleted` };
}

// ─── Publish / unpublish toggle (admin only) ──────────────────────
export async function togglePublish(id, adminUser) {
  const problem = await Problem.findById(id);
  if (!problem) throw NotFound("Problem not found");

  // Must have at least one test case to publish
  if (!problem.isPublished && problem.testCases.length === 0) {
    throw BadRequest("Cannot publish a problem with no test cases");
  }

  problem.isPublished = !problem.isPublished;
  problem.updatedBy = adminUser.sub;
  await problem.save();

  logger.info(`Problem ${problem.isPublished ? "published" : "unpublished"}: ${problem.slug}`);
  return problem;
}

// ─── Get all tags (for filter UI) ────────────────────────────────
export async function getAllTags() {
  const tags = await Problem.distinct("tags", { isPublished: true });
  return tags.sort();
}

// ─── Update stats after a submission verdict ──────────────────────
// Called internally by submissionService in Stage 5
export async function updateProblemStats(problemId, isAccepted) {
  await Problem.findByIdAndUpdate(problemId, {
    $inc: {
      "stats.totalSubmissions": 1,
      ...(isAccepted ? { "stats.acceptedSubmissions": 1 } : {}),
    },
  });
  // Recompute acceptance rate
  const problem = await Problem.findById(problemId).select("stats");
  if (problem && problem.stats.totalSubmissions > 0) {
    const rate =
      (problem.stats.acceptedSubmissions / problem.stats.totalSubmissions) * 100;
    await Problem.findByIdAndUpdate(problemId, {
      $set: { "stats.acceptanceRate": Math.round(rate * 10) / 10 },
    });
  }
}

export default {
  listProblems,
  getProblemBySlug,
  getProblemById,
  createProblem,
  updateProblem,
  deleteProblem,
  togglePublish,
  getAllTags,
  updateProblemStats,
};
