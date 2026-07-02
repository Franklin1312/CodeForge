// MongoDB init script — runs once on first container start
// Creates the codeforge database, app user, and initial collections

db = db.getSiblingDB("codeforge");

// Create app user with least privilege
db.createUser({
  user: "codeforge_app",
  pwd: "apppassword",
  roles: [{ role: "readWrite", db: "codeforge" }],
});

// Create collections with validators
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["email", "username", "role"],
      properties: {
        email: { bsonType: "string" },
        username: { bsonType: "string" },
        role: { enum: ["user", "admin", "premium"] },
      },
    },
  },
});

db.createCollection("problems");
db.createCollection("submissions");
db.createCollection("refreshTokens");
db.createCollection("aiLogs");

// Indexes — performance critical
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ username: 1 }, { unique: true });
db.problems.createIndex({ slug: 1 }, { unique: true });
db.problems.createIndex({ tags: 1 });
db.problems.createIndex({ difficulty: 1 });
db.submissions.createIndex({ userId: 1, createdAt: -1 });
db.submissions.createIndex({ problemId: 1 });
db.submissions.createIndex(
  { createdAt: 1 },
  { expireAfterSeconds: 7776000 } // 90 days TTL
);
db.refreshTokens.createIndex({ hashedToken: 1 }, { unique: true });
db.refreshTokens.createIndex({ userId: 1 });
db.refreshTokens.createIndex(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 } // auto-delete expired tokens
);
db.aiLogs.createIndex({ userId: 1, createdAt: -1 });
db.aiLogs.createIndex(
  { createdAt: 1 },
  { expireAfterSeconds: 2592000 } // 30 days TTL
);

print("✅ CodeForge DB initialized with collections and indexes");
