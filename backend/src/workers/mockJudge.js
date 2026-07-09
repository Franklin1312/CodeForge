/**
 * Mock judge — used when Docker is unavailable (dev laptops, CI, Gitpod free tier).
 *
 * Behaviour:
 *   - Simulates realistic judge latency (100–400ms per test case)
 *   - Deterministic: same code always gets the same verdict
 *   - Detects obvious wrong answers (returns empty string → WA)
 *   - Detects syntax errors in Python/JS via simple heuristics → CE
 *   - Passes all other code → AC
 *
 * To force mock mode: set JUDGE_MOCK=true in .env
 * Mock mode is also auto-enabled when Docker is unreachable.
 */

import crypto from "crypto";
import logger from "../utils/logger.js";

// Simple syntax heuristics — not a real parser, just catches obvious errors
const SYNTAX_CHECKS = {
  python: (code) => {
    const errors = [];
    if (/def\s+\w+\s*\([^)]*\)\s*$/.test(code)) errors.push("Missing colon after function definition");
    if (/for\s+\w+\s+in\s+\w+\s*$/.test(code)) errors.push("Missing colon after for statement");
    if (/^\s*return\s*$/.test(code)) errors.push("Bare return outside function");
    return errors;
  },
  javascript: (code) => {
    const opens  = (code.match(/\{/g) || []).length;
    const closes = (code.match(/\}/g) || []).length;
    if (Math.abs(opens - closes) > 2) return ["Mismatched braces"];
    return [];
  },
  java: (code) => {
    if (!code.includes("class ")) return ["Missing class declaration"];
    return [];
  },
  cpp:  () => [],
  go:   () => [],
  rust: () => [],
};

function fakeDelay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function pseudoRandom(seed, max) {
  const h = crypto.createHash("md5").update(seed).digest("hex");
  return parseInt(h.slice(0, 8), 16) % max;
}

export async function runMockJudge({ code, language, testCases, timeLimit }) {
  logger.warn("⚠️  Using MOCK judge — Docker not available");

  // ── Compile check ────────────────────────────────────────────
  const syntaxCheck = SYNTAX_CHECKS[language] || (() => []);
  const syntaxErrors = syntaxCheck(code);

  if (syntaxErrors.length > 0) {
    await fakeDelay(300);
    const ceResults = testCases.map((_, i) => ({
      testCaseIndex: i, verdict: "CE", runtime: 0, memory: 0, isHidden: testCases[i].isHidden ?? false,
    }));
    return {
      verdict:      "CE",
      runtime:      0,
      memory:       0,
      compileError: `Syntax error: ${syntaxErrors[0]}\n\n(Mock judge — run Docker for real results)`,
      testResults:  ceResults,
    };
  }

  // ── Per-test-case simulation ──────────────────────────────────
  const results = [];
  let overallVerdict = "AC";
  let maxRuntime = 0;
  let maxMemory  = 0;

  // Seed verdict from code hash — same code always gets same result
  const codeHash = crypto.createHash("sha256").update(code + language).digest("hex");

  // Decide if this solution "passes" based on code content heuristics
  // Empty / placeholder code → WA
  const isPlaceholder = /pass\s*$|return\s+None\s*$|\/\/\s*your code|TODO|placeholder/i.test(code);
  const isEmptyBody   = code.replace(/\/\/.*/g, "").replace(/#.*/g, "").trim().length < 20;

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    const delay = 80 + pseudoRandom(`${codeHash}-delay-${i}`, 250);
    await fakeDelay(delay);

    const runtime = 50 + pseudoRandom(`${codeHash}-rt-${i}`, timeLimit * 0.4);
    const memory  = 4096 + pseudoRandom(`${codeHash}-mem-${i}`, 32768);

    if (runtime > maxRuntime) maxRuntime = runtime;
    if (memory  > maxMemory)  maxMemory  = memory;

    let verdict;
    if (isPlaceholder || isEmptyBody) {
      verdict = i === 0 ? "WA" : "WA";
    } else {
      verdict = "AC";
    }

    const row = {
      testCaseIndex: i,
      verdict,
      runtime,
      memory,
      isHidden: tc.isHidden ?? false,
    };

    if (!tc.isHidden) {
      row.input    = (tc.input || "").slice(0, 500);
      row.expected = (tc.expectedOutput || "").slice(0, 500);
      row.actual   = verdict === "AC" ? tc.expectedOutput : "(mock — no real execution)";
    }

    results.push(row);

    if (verdict !== "AC" && overallVerdict === "AC") {
      overallVerdict = verdict;
    }
  }

  return {
    verdict:      overallVerdict,
    runtime:      maxRuntime,
    memory:       maxMemory,
    compileError: null,
    testResults:  results,
    _mock:        true,  // flag so UI can show a banner
  };
}

export default runMockJudge;
