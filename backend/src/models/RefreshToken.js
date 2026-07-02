import mongoose from "mongoose";

// Refresh tokens are stored hashed (SHA-256) — the raw token is never persisted.
// Each token is single-use: after one rotation the old record is deleted.
// A TTL index automatically clears expired tokens from MongoDB.

const refreshTokenSchema = new mongoose.Schema(
  {
    // SHA-256 hash of the raw opaque token
    hashedToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Device fingerprint — used for "logout all devices"
    deviceId: {
      type: String,
      required: true,
    },

    // Human-readable device info for the "active sessions" UI
    userAgent: String,
    ipAddress: String,

    // TTL index will auto-delete this document when expiresAt passes
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 },
    },

    // Rotation tracking — mark old tokens as used before deleting
    // (prevents race conditions during concurrent refreshes)
    isUsed: { type: Boolean, default: false },
    usedAt: Date,
  },
  { timestamps: true }
);

// ─── Statics ──────────────────────────────────────────────────────
refreshTokenSchema.statics.revokeAllForUser = function (userId) {
  return this.deleteMany({ userId });
};

refreshTokenSchema.statics.revokeDevice = function (userId, deviceId) {
  return this.deleteMany({ userId, deviceId });
};

const RefreshToken = mongoose.model("RefreshToken", refreshTokenSchema);
export default RefreshToken;
