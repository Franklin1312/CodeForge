import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectIsAuthenticated, selectCurrentUser } from "../store/slices/authSlice.js";
import { VerdictStamp, Button } from "../components/ui/index.jsx";

// ─── Judging demo sequence (the hero's thesis) ────────────────────
const DEMO_CODE = [
  "def two_sum(nums, target):",
  "    seen = {}",
  "    for i, n in enumerate(nums):",
  "        if target - n in seen:",
  "            return [seen[target - n], i]",
  "        seen[n] = i",
];
const DEMO_STEPS = [
  "compiling solution.py...",
  "running test 1 / 4  [0.9ms]",
  "running test 2 / 4  [1.1ms]",
  "running test 3 / 4  [0.8ms]",
  "running test 4 / 4  [1.0ms]",
];

function JudgeDemo() {
  const [lineIdx, setLineIdx] = useState(0);
  const [stepIdx, setStepIdx] = useState(-1);
  const [showStamp, setShowStamp] = useState(false);
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    setLineIdx(0); setStepIdx(-1); setShowStamp(false);
    let t = [];
    DEMO_CODE.forEach((_, i) => t.push(setTimeout(() => setLineIdx(i + 1), 220 + i * 260)));
    const codeEnd = 220 + DEMO_CODE.length * 260;
    DEMO_STEPS.forEach((_, i) => t.push(setTimeout(() => setStepIdx(i), codeEnd + 300 + i * 380)));
    const stepsEnd = codeEnd + 300 + DEMO_STEPS.length * 380;
    t.push(setTimeout(() => setShowStamp(true), stepsEnd + 400));
    t.push(setTimeout(() => setCycle((c) => c + 1), stepsEnd + 5200));
    return () => t.forEach(clearTimeout);
  }, [cycle]);

  return (
    <div className="term-window" style={{ maxWidth: "520px", width: "100%" }}>
      <div className="term-titlebar">
        <span className="term-dot" style={{ background: "var(--v-wa)" }} />
        <span className="term-dot" style={{ background: "var(--v-ce)" }} />
        <span className="term-dot" style={{ background: "var(--v-ac)" }} />
        <span style={{ marginLeft: "8px", fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text-muted)" }}>
          submission_4471.py
        </span>
      </div>
      <div style={{ padding: "20px", minHeight: "260px", fontFamily: "var(--font-mono)", fontSize: "13px" }}>
        {DEMO_CODE.slice(0, lineIdx).map((line, i) => (
          <div key={i} style={{ color: "var(--text-secondary)", whiteSpace: "pre" }}>
            <span style={{ color: "var(--text-muted)", marginRight: "12px" }}>{String(i + 1).padStart(2, "0")}</span>
            {line}
          </div>
        ))}
        {lineIdx > 0 && lineIdx <= DEMO_CODE.length && stepIdx < 0 && (
          <span className="blink-cursor" style={{ marginLeft: "26px" }} />
        )}

        {stepIdx >= 0 && (
          <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px dashed var(--border)" }}>
            {DEMO_STEPS.slice(0, stepIdx + 1).map((step, i) => (
              <div key={i} style={{ color: i === stepIdx && !showStamp ? "var(--brand)" : "var(--text-muted)", marginBottom: "4px" }}>
                <span style={{ color: "var(--v-ac)" }}>{"> "}</span>{step}
              </div>
            ))}
          </div>
        )}

        {showStamp && (
          <div style={{ marginTop: "20px", display: "flex", justifyContent: "center" }}>
            <VerdictStamp verdict="AC" animate key={cycle} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Scoreboard stat strip ────────────────────────────────────────
function ScoreboardStrip() {
  const stats = [
    ["1,204", "problems"],
    ["38,502", "judged today"],
    ["6", "languages"],
    ["128ms", "median judge time"],
  ];
  return (
    <div style={{
      display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0",
      fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--text-muted)",
    }}>
      {stats.map(([n, label], i) => (
        <div key={label} style={{ display: "flex", alignItems: "baseline", gap: "8px", padding: "0 20px", borderLeft: i > 0 ? "1px solid var(--border)" : "none" }}>
          <span style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "16px" }}>{n}</span>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}

const STAGES = [
  { icon: "🏗️", label: "Scaffold",  done: true },
  { icon: "🔐", label: "Auth",      done: true },
  { icon: "⚛️", label: "Frontend",  done: true },
  { icon: "📚", label: "Problems",  done: true },
  { icon: "💻", label: "Editor",    done: true },
  { icon: "🐳", label: "Judge",     done: true },
  { icon: "✨", label: "AI Coach",  done: true },
];

export default function HomePage() {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectCurrentUser);

  return (
    <div>
      {/* ── Hero ──────────────────────────────────────────────── */}
      <section style={{ maxWidth: "1100px", margin: "0 auto", padding: "72px 24px 48px", display: "flex", gap: "56px", alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 420px", minWidth: "320px" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--brand)",
            background: "var(--brand-tint)", padding: "5px 12px", borderRadius: "var(--radius-full)",
            marginBottom: "20px", letterSpacing: "0.02em",
          }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--v-ac)", display: "inline-block" }} />
            judge online
          </div>

          <h1 style={{
            fontFamily: "var(--font-display)", fontSize: "clamp(2.2rem, 5vw, 3.4rem)",
            fontWeight: 700, lineHeight: 1.08, letterSpacing: "-0.02em",
            color: "var(--text-primary)", marginBottom: "20px",
          }}>
            Write code.<br />
            <span style={{ color: "var(--brand)" }}>Get judged.</span><br />
            Get better.
          </h1>

          <p style={{ fontSize: "16px", color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: "32px", maxWidth: "440px" }}>
            {isAuthenticated
              ? <>Welcome back, <strong style={{ color: "var(--text-primary)" }}>{user?.username}</strong>. Your next Accepted is waiting.</>
              : "A competitive programming judge with sandboxed execution and an AI coach that actually explains the approach — not just the answer."}
          </p>

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            {isAuthenticated ? (
              <Link to="/problems"><Button size="lg">Browse problems →</Button></Link>
            ) : (
              <>
                <Link to="/register"><Button size="lg">Start solving →</Button></Link>
                <Link to="/login"><Button size="lg" variant="outline">Sign in</Button></Link>
              </>
            )}
          </div>
        </div>

        <div style={{ flex: "1 1 420px", minWidth: "320px", display: "flex", justifyContent: "center" }}>
          <JudgeDemo />
        </div>
      </section>

      {/* ── Scoreboard strip ──────────────────────────────────── */}
      <section style={{ borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", background: "var(--surface-1)", padding: "24px 0" }}>
        <ScoreboardStrip />
      </section>

      {/* ── Build status ─────────────────────────────────────── */}
      <section style={{ maxWidth: "1100px", margin: "0 auto", padding: "56px 24px" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "13px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "20px", textAlign: "center" }}>
          System status
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "10px" }}>
          {STAGES.map((s) => (
            <div key={s.label} style={{
              background: "var(--surface-1)",
              border: `1px solid ${s.done ? "var(--brand)" : "var(--border)"}`,
              borderRadius: "var(--radius-md)", padding: "16px", textAlign: "center",
            }}>
              <div style={{ fontSize: "22px", marginBottom: "8px" }}>{s.icon}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", fontWeight: 600, color: s.done ? "var(--brand)" : "var(--text-muted)" }}>
                {s.label} {s.done && <span style={{ color: "var(--v-ac)" }}>✓</span>}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
