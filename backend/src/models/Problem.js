import mongoose from "mongoose";

// ─── Sub-schemas ──────────────────────────────────────────────────
const testCaseSchema = new mongoose.Schema(
  {
    input:          { type: String, required: true },
    expectedOutput: { type: String, required: true },
    // Hidden test cases are never sent to the client
    isHidden:       { type: Boolean, default: false },
    explanation:    { type: String },
  },
  { _id: true }
);

const exampleSchema = new mongoose.Schema(
  {
    input:       { type: String, required: true },
    output:      { type: String, required: true },
    explanation: { type: String },
  },
  { _id: false }
);

const editorialSchema = new mongoose.Schema(
  {
    content:    { type: String },      // Markdown
    approach:   { type: String },
    complexity: {
      time:   { type: String },
      space:  { type: String },
    },
    // Only admins/premium can view editorials
    isPremium:  { type: Boolean, default: false },
  },
  { _id: false }
);

// ─── Main schema ──────────────────────────────────────────────────
const problemSchema = new mongoose.Schema(
  {
    // Human-readable URL identifier: "two-sum", "valid-parentheses"
    slug: {
      type: String,
      required: [true, "Slug is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[a-z0-9-]+$/, "Slug may only contain lowercase letters, numbers, and hyphens"],
    },

    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [200, "Title must be at most 200 characters"],
    },

    difficulty: {
      type: String,
      required: true,
      enum: ["easy", "medium", "hard"],
    },

    // Problem statement in Markdown (supports LaTeX via KaTeX)
    description: {
      type: String,
      required: [true, "Description is required"],
    },

    // Constraints in Markdown: "1 ≤ n ≤ 10^5"
    constraints: {
      type: String,
    },

    // Public examples shown in the problem statement
    examples: [exampleSchema],

    // All test cases (mix of public and hidden)
    testCases: [testCaseSchema],

    // Tags: ["array", "hash-table", "dynamic-programming"]
    tags: [{ type: String, trim: true, lowercase: true }],

    // Supported languages: ["python", "javascript", "java", "cpp", "go"]
    allowedLanguages: {
      type: [String],
      default: ["python", "javascript", "java", "cpp", "go", "rust"],
    },

    // Execution limits
    timeLimit:   { type: Number, default: 2000, min: 100, max: 10000 },   // ms
    memoryLimit: { type: Number, default: 256,  min: 16,  max: 1024 },   // MB

    // Starter code per language
    starterCode: {
      type: Map,
      of: String,
      default: {},
    },

    // Editorial (admin-authored solution explanation)
    editorial: editorialSchema,

    // Visibility
    isPublished:  { type: Boolean, default: false },
    isPremium:    { type: Boolean, default: false },

    // Stats (denormalized for fast reads — updated async on submission)
    stats: {
      totalSubmissions:  { type: Number, default: 0 },
      acceptedSubmissions: { type: Number, default: 0 },
      acceptanceRate:    { type: Number, default: 0 }, // 0–100
    },

    // Who created/last edited
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────
problemSchema.index({ difficulty: 1 });
problemSchema.index({ tags: 1 });
problemSchema.index({ isPublished: 1 });
problemSchema.index({ "stats.acceptanceRate": 1 });
// Text search on title + tags
problemSchema.index({ title: "text", tags: "text" }, { weights: { title: 10, tags: 3 } });

// ─── Virtuals ─────────────────────────────────────────────────────
problemSchema.virtual("publicTestCases").get(function () {
  return this.testCases.filter((tc) => !tc.isHidden);
});

// ─── Methods ──────────────────────────────────────────────────────
// Strip hidden test cases + editorial for non-admin/non-premium responses
problemSchema.methods.toClientView = function (user = null) {
  const obj = this.toObject({ virtuals: true });
  const isAdmin = user?.role === "admin";
  const isPremium = user?.role === "premium" || isAdmin;

  // Always strip hidden test cases from client response
  obj.testCases = obj.testCases.filter((tc) => !tc.isHidden);

  // Strip editorial if premium-only and user isn't premium
  if (obj.editorial?.isPremium && !isPremium) {
    delete obj.editorial;
  }

  return obj;
};

const Problem = mongoose.model("Problem", problemSchema);
export default Problem;