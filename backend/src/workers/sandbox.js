import { spawn } from "child_process";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";
import crypto from "crypto";
import { getLangConfig } from "./languageRegistry.js";
import { ensureImage } from "./imageManager.js";
import logger from "../utils/logger.js";

const execAsync = promisify(exec);

// ─── Config from env ──────────────────────────────────────────────
const MEMORY_LIMIT  = process.env.JUDGE_MEMORY_LIMIT  || "256m";
const CPU_LIMIT     = process.env.JUDGE_CPU_LIMIT      || "0.5";
const PIDS_LIMIT    = parseInt(process.env.JUDGE_PIDS)  || 50;
const TMP_SIZE      = process.env.JUDGE_TMP_SIZE        || "32m";

// ─── Execution result shape ───────────────────────────────────────
// { stdout, stderr, exitCode, timedOut, oom, wallMs, memoryKB }

// ─── Core Docker run ──────────────────────────────────────────────
function spawnDocker({ image, workDir, cmd, stdinData, timeoutMs, containerName }) {
  return new Promise((resolve) => {
    const args = [
      "run",
      "--rm",

      // ── Identity ──────────────────────────────────────────────
      "--user=65534:65534",          // nobody:nogroup — non-root

      // ── Network ───────────────────────────────────────────────
      "--network=none",              // zero outbound access

      // ── Resources ─────────────────────────────────────────────
      `--memory=${MEMORY_LIMIT}`,
      `--memory-swap=${MEMORY_LIMIT}`, // no swap
      `--cpus=${CPU_LIMIT}`,
      `--pids-limit=${PIDS_LIMIT}`,  // prevent fork bombs

      // ── Filesystem ────────────────────────────────────────────
      "--read-only",                 // immutable root FS
      `--tmpfs=/tmp:rw,noexec,nosuid,size=${TMP_SIZE}`,
      `--tmpfs=/run:rw,noexec,nosuid,size=1m`,

      // ── Capabilities ──────────────────────────────────────────
      "--cap-drop=ALL",              // drop all Linux capabilities
      "--security-opt=no-new-privileges", // prevent privilege escalation
      "--security-opt=apparmor=unconfined", // allow in dev (tighten in prod)

      // ── Ulimits ───────────────────────────────────────────────
      "--ulimit", "nofile=64:64",    // max open files
      "--ulimit", "nproc=50:50",     // max processes (redundant with pids-limit)
      "--ulimit", "fsize=10485760",  // max file write: 10MB

      // ── Labels for cleanup ────────────────────────────────────
      "--label=codeforge.judge=true",
      `--label=codeforge.submission=${containerName}`,

      // ── Code volume (read-only) ───────────────────────────────
      `-v=${workDir}:/code:ro,noexec`,
      "--workdir=/code",

      // ── Hostname spoofing (aesthetics) ────────────────────────
      "--hostname=judge",

      image,
      "sh", "-c", cmd,
    ];

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let killed = false;

    const proc = spawn("docker", args, {
      stdio: ["pipe", "pipe", "pipe"],
      detached: false,
    });

    // Feed stdin
    if (stdinData) {
      try {
        proc.stdin.write(stdinData);
        proc.stdin.end();
      } catch {
        // ignore if stdin is already closed
      }
    } else {
      proc.stdin.end();
    }

    // Cap stdout/stderr to avoid memory exhaustion from infinite-loop output
    const MAX_OUTPUT = 256 * 1024; // 256 KB

    proc.stdout.on("data", (chunk) => {
      if (stdout.length < MAX_OUTPUT) stdout += chunk.toString();
    });
    proc.stderr.on("data", (chunk) => {
      if (stderr.length < MAX_OUTPUT) stderr += chunk.toString();
    });

    // Hard kill after timeout
    const timer = setTimeout(() => {
      timedOut = true;
      killed = true;
      proc.kill("SIGKILL");
      // Also kill any orphaned container by name
      execAsync(`docker stop ${containerName} 2>/dev/null`).catch(() => {});
    }, timeoutMs);

    proc.on("close", (exitCode) => {
      clearTimeout(timer);
      // Exit 137 = SIGKILL (OOM or explicit kill)
      const oom = exitCode === 137 && !timedOut && !killed;
      resolve({
        stdout: stdout.trimEnd(),
        stderr: stderr.trimEnd(),
        exitCode: exitCode ?? 1,
        timedOut,
        oom,
        wallMs: 0,       // filled by caller
        memoryKB: 0,     // Docker stats not collected here for speed
      });
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      logger.error("Docker spawn error:", err.message);
      resolve({
        stdout: "",
        stderr: `Docker error: ${err.message}`,
        exitCode: 1,
        timedOut: false,
        oom: false,
        wallMs: 0,
        memoryKB: 0,
      });
    });
  });
}

// ─── Run compile step ─────────────────────────────────────────────
async function compile({ image, workDir, compileCmd, compileTimeout, containerName }) {
  const result = await spawnDocker({
    image,
    workDir,
    cmd: compileCmd,
    stdinData: null,
    timeoutMs: compileTimeout,
    containerName: `${containerName}-compile`,
  });

  if (result.exitCode !== 0) {
    return {
      success: false,
      error: (result.stderr || result.stdout || "Compilation failed").slice(0, 3000),
    };
  }
  return { success: true };
}

// ─── Run one test case ────────────────────────────────────────────
async function executeTestCase({ image, workDir, runCmd, stdinData, timeLimitMs, containerName }) {
  const start = Date.now();

  const result = await spawnDocker({
    image,
    workDir,
    cmd: runCmd,
    stdinData,
    timeoutMs: timeLimitMs + 2000,  // 2s grace above problem limit
    containerName,
  });

  result.wallMs = Date.now() - start;
  return result;
}

// ─── Output normalisation ─────────────────────────────────────────
function normalise(s) {
  return (s || "")
    .trim()
    .replace(/\r\n/g, "\n")     // CRLF → LF
    .replace(/[ \t]+$/gm, "")  // trailing spaces per line
    .replace(/\n+$/, "");       // trailing newlines
}

export function outputsMatch(actual, expected) {
  return normalise(actual) === normalise(expected);
}

// ─── Full sandbox execution ───────────────────────────────────────
export async function runInSandbox({ code, language, testCases, timeLimit, memoryLimit }) {
  const lang  = getLangConfig(language);
  const image = lang.image;

  // Ensure image is available
  const ready = await ensureImage(image);
  if (!ready) {
    return {
      verdict:     "SE",
      runtime:     0,
      memory:      0,
      compileError: `Docker image unavailable: ${image}`,
      testResults: [],
    };
  }

  // ── Create isolated temp workspace ───────────────────────────
  const runId   = crypto.randomBytes(8).toString("hex");
  const workDir = path.join(os.tmpdir(), `cf-${runId}`);

  try {
    await fs.mkdir(workDir, { recursive: true });

    // Write source file
    await fs.writeFile(path.join(workDir, lang.filename), code, { encoding: "utf8", mode: 0o444 });

    // ── Compile (if needed) ───────────────────────────────────
    if (lang.compileCmd) {
      const compileResult = await compile({
        image,
        workDir,
        compileCmd: lang.compileCmd,
        compileTimeout: lang.compileTimeout,
        containerName: `cf-${runId}`,
      });

      if (!compileResult.success) {
        return {
          verdict:      "CE",
          runtime:      0,
          memory:       0,
          compileError: compileResult.error,
          testResults:  testCases.map((_, i) => ({
            testCaseIndex: i,
            verdict:   "CE",
            runtime:   0,
            memory:    0,
            isHidden:  testCases[i].isHidden ?? false,
          })),
        };
      }
    }

    // ── Run each test case ────────────────────────────────────
    const testResults = [];
    let overallVerdict = "AC";
    let maxRuntime = 0;
    let maxMemory  = 0;

    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];

      let verdict, runtime, memory, actual = "";

      try {
        const res = await executeTestCase({
          image,
          workDir,
          runCmd:      lang.runCmd,
          stdinData:   tc.input,
          timeLimitMs: timeLimit,
          containerName: `cf-${runId}-t${i}`,
        });

        runtime = res.wallMs;
        memory  = res.memoryKB;

        if (res.oom) {
          verdict = "MLE";
        } else if (res.timedOut || runtime > timeLimit) {
          verdict = "TLE";
          runtime = timeLimit; // cap displayed runtime
        } else if (res.exitCode !== 0) {
          verdict = "RE";
          actual  = res.stderr.slice(0, 500);
        } else {
          actual  = res.stdout;
          verdict = outputsMatch(actual, tc.expectedOutput) ? "AC" : "WA";
        }
      } catch (err) {
        logger.error(`Test case ${i} threw:`, err.message);
        verdict = "SE";
        runtime = 0;
        memory  = 0;
      }

      if (runtime > maxRuntime) maxRuntime = runtime;
      if (memory  > maxMemory)  maxMemory  = memory;

      const row = {
        testCaseIndex: i,
        verdict,
        runtime,
        memory,
        isHidden: tc.isHidden ?? false,
      };

      // Expose I/O only for non-hidden cases
      if (!tc.isHidden) {
        row.input    = (tc.input    || "").slice(0, 500);
        row.expected = (tc.expectedOutput || "").slice(0, 500);
        row.actual   = actual.slice(0, 500);
      }

      testResults.push(row);

      // First non-AC verdict becomes the overall result
      if (verdict !== "AC" && overallVerdict === "AC") {
        overallVerdict = verdict;
      }

      // Stop early on CE/SE (no more test cases will pass)
      if (verdict === "CE" || verdict === "SE") break;
    }

    return {
      verdict:     overallVerdict,
      runtime:     maxRuntime,
      memory:      maxMemory,
      compileError: null,
      testResults,
    };

  } finally {
    // Always delete the workspace — even if an exception occurs
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

export default runInSandbox;
