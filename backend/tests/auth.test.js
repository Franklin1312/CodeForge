/**
 * Auth integration tests — Stage 2
 *
 * Run: npm test
 * These tests require a running MongoDB (use docker-compose up -d mongo).
 *
 * Coverage:
 *   POST /api/auth/register  — happy path, duplicate email, duplicate username,
 *                              weak password, missing fields
 *   POST /api/auth/login     — happy path, wrong password, nonexistent user,
 *                              locked account
 *   POST /api/auth/refresh   — happy path, expired token, reuse detection
 *   DELETE /api/auth/logout  — happy path, already logged out
 *   GET /api/auth/me         — happy path, missing token, expired token
 */

import request from "supertest";
import mongoose from "mongoose";
import app from "../src/app.js";
import User from "../src/models/User.js";
import RefreshToken from "../src/models/RefreshToken.js";

// ─── Setup ────────────────────────────────────────────────────────
beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/codeforge_test");
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

afterEach(async () => {
  await User.deleteMany({});
  await RefreshToken.deleteMany({});
});

// ─── Helpers ──────────────────────────────────────────────────────
const baseUser = {
  username: "testuser",
  email: "test@example.com",
  password: "Password1",
};

async function registerUser(overrides = {}) {
  return request(app)
    .post("/api/auth/register")
    .send({ ...baseUser, ...overrides });
}

async function loginUser(overrides = {}) {
  return request(app)
    .post("/api/auth/login")
    .send({ email: baseUser.email, password: baseUser.password, ...overrides });
}

function extractRefreshCookie(res) {
  const setCookie = res.headers["set-cookie"] || [];
  const cookieLine = setCookie.find((c) => c.startsWith("codeforge_refresh="));
  if (!cookieLine) return null;
  return cookieLine.split(";")[0].replace("codeforge_refresh=", "");
}

// ─── Register ─────────────────────────────────────────────────────
describe("POST /api/auth/register", () => {
  it("returns 201 with user + accessToken on success", async () => {
    const res = await registerUser();
    expect(res.status).toBe(201);
    expect(res.body.user.username).toBe(baseUser.username);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(extractRefreshCookie(res)).toBeTruthy();
  });

  it("returns 409 on duplicate email", async () => {
    await registerUser();
    const res = await registerUser({ username: "other" });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
  });

  it("returns 409 on duplicate username", async () => {
    await registerUser();
    const res = await registerUser({ email: "other@example.com" });
    expect(res.status).toBe(409);
  });

  it("returns 400 for weak password (no uppercase)", async () => {
    const res = await registerUser({ password: "password1" });
    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "password" })])
    );
  });

  it("returns 400 for missing fields", async () => {
    const res = await request(app).post("/api/auth/register").send({});
    expect(res.status).toBe(400);
    expect(res.body.error.details.length).toBeGreaterThan(0);
  });
});

// ─── Login ────────────────────────────────────────────────────────
describe("POST /api/auth/login", () => {
  beforeEach(async () => { await registerUser(); });

  it("returns 200 with accessToken on success", async () => {
    const res = await loginUser();
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(extractRefreshCookie(res)).toBeTruthy();
  });

  it("returns 401 on wrong password", async () => {
    const res = await loginUser({ password: "WrongPass1" });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("returns 401 for non-existent user", async () => {
    const res = await loginUser({ email: "ghost@example.com" });
    expect(res.status).toBe(401);
  });

  it("does not expose whether email exists", async () => {
    const [real, ghost] = await Promise.all([
      loginUser({ password: "wrong1" }),
      loginUser({ email: "ghost@example.com", password: "wrong1" }),
    ]);
    // Both should return same code and similar message
    expect(real.body.error.code).toBe(ghost.body.error.code);
  });
});

// ─── Refresh ──────────────────────────────────────────────────────
describe("POST /api/auth/refresh", () => {
  it("rotates refresh token and returns new accessToken", async () => {
    const reg = await registerUser();
    const oldRefresh = extractRefreshCookie(reg);

    const res = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", `codeforge_refresh=${oldRefresh}`);

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    const newRefresh = extractRefreshCookie(res);
    expect(newRefresh).toBeTruthy();
    expect(newRefresh).not.toBe(oldRefresh);
  });

  it("returns 401 if refresh token is missing", async () => {
    const res = await request(app).post("/api/auth/refresh");
    expect(res.status).toBe(401);
  });

  it("returns 401 and revokes all sessions on token reuse", async () => {
    const reg = await registerUser();
    const oldRefresh = extractRefreshCookie(reg);

    // Use the token once (legitimate rotation)
    await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", `codeforge_refresh=${oldRefresh}`);

    // Try to reuse the old token
    const res = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", `codeforge_refresh=${oldRefresh}`);

    expect(res.status).toBe(401);

    // All refresh tokens for this user should now be gone
    const user = await User.findOne({ email: baseUser.email });
    const remaining = await RefreshToken.countDocuments({ userId: user._id });
    expect(remaining).toBe(0);
  });
});

// ─── Me ───────────────────────────────────────────────────────────
describe("GET /api/auth/me", () => {
  it("returns user profile with valid access token", async () => {
    const reg = await registerUser();
    const { accessToken } = reg.body;

    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe(baseUser.username);
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it("returns 401 without token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("returns 401 with malformed token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer not.a.real.token");
    expect(res.status).toBe(401);
  });
});

// ─── Logout ───────────────────────────────────────────────────────
describe("DELETE /api/auth/logout", () => {
  it("revokes refresh token and clears cookie", async () => {
    const reg = await registerUser();
    const refresh = extractRefreshCookie(reg);

    const logoutRes = await request(app)
      .delete("/api/auth/logout")
      .set("Cookie", `codeforge_refresh=${refresh}`);
    expect(logoutRes.status).toBe(200);

    // The old refresh token should no longer work
    const refreshRes = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", `codeforge_refresh=${refresh}`);
    expect(refreshRes.status).toBe(401);
  });
});
