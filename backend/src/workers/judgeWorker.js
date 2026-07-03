import { exec, spawn } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { VERDICTS } from "../models/Submission.js";
import logger from "../utils/logger.js";

const execAsync = promisify(exec);

// ─── Language configuration ───────────────────────────────────────
const LANG_CONFIG = {
  python: {
    image:     "python:3.12-alpine",
    filename:  "solution.py",
    runCmd:    "python solution.py",
    compileCmd: null,
  },
  javascript: {
    image:     "node:20-alpine",
    filename:  "solution.js",
    runCmd:    "node solution.js",
    compileCmd: null,
  },
  java: {
    image:     "openjdk:21-alpine",
    filename:  "Solution.java",
    runCmd:    "java Solution",
    compileCmd: "javac Solution.java",
  },
  cpp: {
    image:     "gcc:13-bookworm",
    filename:  "solution.cpp",
    runCmd:    "./solution",
    compileCmd: "g++ -O2 -o solution solution.cpp",
  },
  go: {
    image:     "golang:1.22-alpine",
    filename:  "solution.go",
    runCmd:    "go run solution.go",
    compileCmd: null,
  },
  rust: {
    image:     "rust:1.78-alpine",
    filename:  "solution.rs",
    runCmd:    "./solution",
    compileCmd: "rustc -O -o solution solution.rs",
  },
};

const TIMEOUT_MS    = parseInt(process.env.JUDGE_TIMEOUT_MS)  || 10_000;
const MEMORY_LIMIT  = process.env.JUDGE_MEMORY_LIMIT          || "256m";
const CPU_LIMIT     = process.env.JUDGE_CPU_LIMIT             || "0.5";

// ─── Run one test case inside Docker ─────────────────────────────
async function runTestCase(code, language, input, timeLimitMs) {
  const lang    = LANG_CONFIG[language];
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "cf-judge-"));

  try {
    // Write code to temp file
    await fs.writeFile(path.join(workDir, lang.filename), code, "utf8");

    // Write stdin to file
    await fs.writeFile(path.join(workDir, "input.txt"), input, "utf8");

    // ── Compile if needed ──────────────────────────────────────
    if (lang.compileCmd) {
      const compileResult = await dockerRun({
        image:    lang.image,
        workDir,
        cmd:      lang.compileCmd,
        timeoutMs: 15_000,   // generous compile timeout
        memLimit: MEMORY_LIMIT,
        cpuLimit: CPU_LIMIT,
        stdin:    null,
      });

      if (compileResult.exitCode !== 0) {
        return {
          verdict:      VERDICTS.CE,
          compileError: compileResult.stderr.slice(0, 2000),
          runtime:      0,
          memory:       0,
          output:       "",
        };
      }
    }

    // ── Execute ────────────────────────────────────────────────
    const effectiveTimeout = Math.min(timeLimitMs * 2, TIMEOUT_MS);
    const start = Date.now();

    const result = await dockerRun({
      image:    lang.image,
      workDir,
      cmd:      lang.runCmd,
      timeoutMs: effectiveTimeout,
      memLimit: MEMORY_LIMIT,
      cpuLimit: CPU_LIMIT,
      stdin:    input,
    });

    const runtime = Date.now() - start;

    // ── Classify verdict ───────────────────────────────────────
    if (result.oom) {
      return { verdict: VERDICTS.MLE, runtime, memory: result.memory, output: "" };
    }
    if (result.timeout) {
      return { verdict: VERDICTS.TLE, runtime, memory: result.memory, output: "" };
    }
    if (result.exitCode !== 0) {
      return { verdict: VERDICTS.RE, runtime, memory: result.memory, output: result.stderr.slice(0, 500) };
    }
    if (runtime > timeLimitMs) {
      return { verdict: VERDICTS.TLE, runtime, memory: result.memory, output: "" };
    }

    return {
      verdict: null,  // caller compares output
      runtime,
      memory:  result.memory,
      output:  result.stdout,
    };
  } finally {
    // Always clean up temp dir
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

// ─── Docker execution ─────────────────────────────────────────────
function dockerRun({ image, workDir, cmd, timeoutMs, memLimit, cpuLimit, stdin }) {
  return new Promise((resolve) => {
    const dockerCmd = [
      "docker", "run",
      "--rm",                               // remove container after exit
      "--network=none",                     // no network access
      `--memory=${memLimit}`,
      `--memory-swap=${memLimit}`,          // disable swap
      `--cpus=${cpuLimit}`,
      "--read-only",                        // read-only filesystem
      "--tmpfs", "/tmp:size=32m",           // writable /tmp
      "--ulimit", "nproc=50",              // prevent fork bombs
      "--ulimit", "nofile=64",             // limit file descriptors
      "--user=nobody",
      "-v", `${workDir}:/code:ro`,          // mount code read-only
      "-w", "/code",
      image,
      "sh", "-c", cmd,
    ];

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let oom = false;

    const proc = spawn(dockerCmd[0], dockerCmd.slice(1), {
      stdio: ["pipe", "pipe", "pipe"],
    });

    if (stdin) {
      proc.stdin.write(stdin);
      proc.stdin.end();
    }

    proc.stdout.on("data", (d) => { stdout += d.toString(); });
    proc.stderr.on("data", (d) => { stderr += d.toString(); });

    const timer = setTimeout(() => {
      timedOut = true;
      proc.kill("SIGKILL");
      execAsync(`docker kill $(docker ps -q --filter ancestor=${image}) 2>/dev/null`).catch(() => {});
    }, timeoutMs);

    proc.on("close", (exitCode) => {
      clearTimeout(timer);
      // OOM kill exits with code 137
      if (exitCode === 137 && !timedOut) oom = true;
      resolve({ stdout: stdout.trim(), stderr: stderr.trim(), exitCode: exitCode ?? 1, timedOut, oom, memory: 0 });
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      resolve({ stdout: "", stderr: err.message, exitCode: 1, timedOut: false, oom: false, memory: 0 });
    });
  });
}

// ─── Compare output (normalised) ─────────────────────────────────
function normaliseOutput(s) {
  return s.trim().replace(/\r\n/g, "\n").replace(/[ \t]+$/gm, "");
}

function outputMatches(actual, expected) {
  return normaliseOutput(actual) === normaliseOutput(expected);
}

// ─── Judge a full submission ──────────────────────────────────────
export async function judgeSubmission({ code, language, testCases, timeLimit }) {
  const results  = [];
  let   overall  = VERDICTS.AC;
  let   maxRuntime = 0;
  let   maxMemory  = 0;
  let   compileError = null;

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];

    let result;
    try {
      result = await runTestCase(code, language, tc.input, timeLimit);
    } catch (err) {
      logger.error(`Judge error on test ${i}:`, err.message);
      result = { verdict: VERDICTS.SE, runtime: 0, memory: 0, output: "" };
    }

    if (result.verdict === VERDICTS.CE) {
      compileError = result.compileError;
      overall = VERDICTS.CE;
      results.push({ testCaseIndex: i, verdict: VERDICTS.CE, runtime: 0, memory: 0, isHidden: tc.isHidden });
      break; // CE stops all test cases
    }

    const verdict = result.verdict || (outputMatches(result.output, tc.expectedOutput) ? VERDICTS.AC : VERDICTS.WA);

    if (result.runtime > maxRuntime) maxRuntime = result.runtime;
    if (result.memory  > maxMemory)  maxMemory  = result.memory;

    const tcResult = {
      testCaseIndex: i,
      verdict,
      runtime: result.runtime,
      memory:  result.memory,
      isHidden: tc.isHidden ?? false,
      ...(!tc.isHidden && {
        input:    tc.input.slice(0, 500),
        expected: tc.expectedOutput.slice(0, 500),
        actual:   result.output.slice(0, 500),
      }),
    };
    results.push(tcResult);

    // First non-AC verdict wins overall
    if (verdict !== VERDICTS.AC && overall === VERDICTS.AC) {
      overall = verdict;
    }
  }

  return {
    verdict:      overall,
    runtime:      maxRuntime,
    memory:       maxMemory,
    compileError,
    testResults:  results,
  };
}

export default judgeSubmission;
