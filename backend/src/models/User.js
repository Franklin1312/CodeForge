import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 12;

// ─── Sub-schemas ─────────────────────────────────────────────────
const oauthProviderSchema = new mongoose.Schema(
  {
    provider: { type: String, enum: ["github", "google"], required: true },
    providerId: { type: String, required: true },
    email: String,
  },
  { _id: false }
);

const statsSchema = new mongoose.Schema(
  {
    solved:     { type: Number, default: 0 },
    attempted:  { type: Number, default: 0 },
    submissions:{ type: Number, default: 0 },
    score:      { type: Number, default: 0 },
    streak:     { type: Number, default: 0 },
    lastSolvedAt: Date,
  },
  { _id: false }
);

// ─── Main schema ──────────────────────────────────────────────────
const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [30, "Username must be at most 30 characters"],
      match: [/^[a-zA-Z0-9_-]+$/, "Username may only contain letters, numbers, _ and -"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
    },
    passwordHash: {
      type: String,
      // Not required — OAuth users have no password
      select: false, // never returned in queries by default
    },
    role: {
      type: String,
      enum: ["user", "admin", "premium"],
      default: "user",
    },
    avatar: String,
    bio: { type: String, maxlength: 200 },
    oauthProviders: [oauthProviderSchema],
    stats: { type: statsSchema, default: () => ({}) },

    // Account state
    isEmailVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    lastLoginAt: Date,
    loginAttempts: { type: Number, default: 0 },
    lockUntil: Date,
  },
  {
    timestamps: true, // createdAt, updatedAt
    toJSON: {
      transform(doc, ret) {
        // Never expose sensitive fields in JSON output
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ "oauthProviders.provider": 1, "oauthProviders.providerId": 1 });
userSchema.index({ "stats.score": -1 }); // leaderboard

// ─── Virtuals ─────────────────────────────────────────────────────
userSchema.virtual("isLocked").get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// ─── Pre-save hook — hash password ───────────────────────────────
userSchema.pre("save", async function (next) {
  // Only hash if passwordHash was directly modified
  if (!this.isModified("passwordHash")) return next();
  if (!this.passwordHash) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, BCRYPT_ROUNDS);
  next();
});

// ─── Instance methods ─────────────────────────────────────────────
userSchema.methods.comparePassword = async function (plaintext) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(plaintext, this.passwordHash);
};

userSchema.methods.incrementLoginAttempts = async function () {
  const MAX_ATTEMPTS = 10;
  const LOCK_TIME = 2 * 60 * 60 * 1000; // 2 hours

  if (this.lockUntil && this.lockUntil < Date.now()) {
    // Lock expired — reset
    return this.updateOne({ $set: { loginAttempts: 1 }, $unset: { lockUntil: 1 } });
  }

  const updates = { $inc: { loginAttempts: 1 } };
  if (this.loginAttempts + 1 >= MAX_ATTEMPTS && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + LOCK_TIME };
  }
  return this.updateOne(updates);
};

userSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({ $set: { loginAttempts: 0, lastLoginAt: new Date() }, $unset: { lockUntil: 1 } });
};

// Safe public profile (no sensitive fields)
userSchema.methods.toPublicProfile = function () {
  return {
    id: this._id,
    username: this.username,
    email: this.email,
    role: this.role,
    avatar: this.avatar,
    bio: this.bio,
    stats: this.stats,
    isEmailVerified: this.isEmailVerified,
    createdAt: this.createdAt,
  };
};

// ─── Static methods ───────────────────────────────────────────────
userSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase() }).select("+passwordHash");
};

userSchema.statics.findByUsername = function (username) {
  return this.findOne({ username });
};

const User = mongoose.model("User", userSchema);
export default User;
