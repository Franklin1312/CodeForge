import mongoose from "mongoose";
import zlib from "zlib";
import { promisify } from "util";

const gzip   = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

// ─── Verdict constants ────────────────────────────────────────────
export const VERDICTS = {
  PENDING:  "pending",   // queued, not yet picked up
  RUNNING:  "running",   // judge is executing
  AC:       "AC",        // Accepted
  WA:       "WA",        // Wrong Answer
  TLE:      "TLE",       // Time Limit Exceeded
  MLE:      "MLE",       // Memory Limit Exceeded
  RE:       "RE",        // Runtime Error
  CE:       "CE",        // Compile Error
  SE:       "SE",        // System/Internal Error
};

export const VERDICT_LABELS = {
  pending: "Pending",
  running: "Running",
  AC:  "Accepted",
  WA:  "Wrong Answer",
  TLE: "Time Limit Exceeded",
  MLE: "Memory Limit Exceeded",
  RE:  "Runtime Error",
  CE:  "Compile Error",
  SE:  "System Error",
};

export const LANGUAGES = ["python", "javascript", "java", "cpp", "go", "rust"];

// ─── Per-test-case result ─────────────────────────────────────────
const testResultSchema = new mongoose.Schema(
  {
    testCaseIndex: Number,
    verdict:       { type: String, enum: Object.values(VERDICTS) },
    runtime:       Number,   // ms
    memory:        Number,   // KB
    input:         String,   // only for public test cases
    expected:      String,   // only for public test cases
    actual:        String,   // only for public test cases (truncated to 500 chars)
    isHidden:      { type: Boolean, default: false },
  },
  { _id: false }
);

// ─── Main schema ──────────────────────────────────────────────────
const submissionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    problemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Problem",
      required: true,
      index: true,
    },
    problemSlug: String,  // denormalized for fast display

    language: {
      type: String,
      enum: LANGUAGES,
      required: true,
    },

    // Code stored compressed (zlib gzip) — raw string reconstructed via virtual
    codeCompressed: Buffer,

    verdict: {
      type: String,
      enum: Object.values(VERDICTS),
      default: VERDICTS.PENDING,
      index: true,
    },

    // Overall metrics (from the worst-case test)
    runtime: Number,    // ms
    memory:  Number,    // KB

    // Compile error output
    compileError: String,

    // Per-test-case results
    testResults: [testResultSchema],

    // Bull job ID for status polling fallback
    jobId: String,

    // How long the judge took end-to-end
    judgeTimeMs: Number,
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        delete ret.codeCompressed;
        return ret;
      },
    },
  }
);

// ─── TTL index — auto-delete after 90 days ────────────────────────
submissionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });
submissionSchema.index({ userId: 1, createdAt: -1 });
submissionSchema.index({ problemId: 1, verdict: 1 });

// ─── Code compression virtual ─────────────────────────────────────
submissionSchema.methods.setCode = async function (code) {
  this.codeCompressed = await gzip(Buffer.from(code, "utf8"));
};

submissionSchema.methods.getCode = async function () {
  if (!this.codeCompressed) return "";
  const buf = await gunzip(this.codeCompressed);
  return buf.toString("utf8");
};

// ─── Static helpers ───────────────────────────────────────────────
submissionSchema.statics.getUserSubmissionsForProblem = function (userId, problemId) {
  return this.find({ userId, problemId })
    .select("-codeCompressed -testResults")
    .sort({ createdAt: -1 })
    .limit(20);
};

const Submission = mongoose.model("Submission", submissionSchema);
export default Submission;
