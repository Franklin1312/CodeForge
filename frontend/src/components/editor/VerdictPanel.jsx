import { useSelector } from "react-redux";
import { selectActiveSubmission, selectActiveStatus } from "../../store/slices/submissionsSlice.js";
import { Spinner } from "../ui/index.jsx";

const VERDICT_META = {
  pending: { label: "Pending",              color: "var(--text-muted)",    icon: "⏳" },
  running: { label: "Running…",             color: "var(--color-brand)",   icon: "⚙️" },
  AC:      { label: "Accepted",             color: "var(--color-green)",   icon: "✅" },
  WA:      { label: "Wrong Answer",         color: "var(--color-red)",     icon: "❌" },
  TLE:     { label: "Time Limit Exceeded",  color: "var(--color-orange)",  icon: "⏱️" },
  MLE:     { label: "Memory Limit Exceeded",color: "var(--color-orange)",  icon: "💾" },
  RE:      { label: "Runtime Error",        color: "var(--color-red)",     icon: "💥" },
  CE:      { label: "Compile Error",        color: "var(--color-orange)",  icon: "🔧" },
  SE:      { label: "System Error",         color: "var(--text-muted)",    icon: "⚠️" },
};

function TestCaseRow({ result, index }) {
  const meta = VERDICT_META[result.verdict] || VERDICT_META.SE;
  return (
    <div style={{
      border: "1px solid var(--surface-border)", borderRadius: "8px",
      overflow: "hidden", marginBottom: "8px",
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "8px 14px",
        background: result.verdict === "AC" ? "rgba(0,230,118,0.06)" : "rgba(255,23,68,0.06)",
      }}>
        <span style={{ fontSize: "13px", fontWeight: 600, color: meta.color }}>
          {meta.icon} Test {index + 1}
          {result.isHidden && <span style={{ marginLeft: "8px", fontSize: "11px", color: "var(--text-muted)", fontWeight: 400 }}>hidden</span>}
        </span>
        <div style={{ display: "flex", gap: "16px", fontSize: "12px", color: "var(--text-muted)" }}>
          {result.runtime != null && <span>⚡ {result.runtime}ms</span>}
          {result.memory  != null && <span>📦 {(result.memory / 1024).toFixed(1)}MB</span>}
          <span style={{ color: meta.color, fontWeight: 600 }}>{meta.label}</span>
        </div>
      </div>

      {/* Show input/expected/actual for non-hidden WA */}
      {!result.isHidden && result.verdict === "WA" && (
        <div style={{ padding: "12px 14px", display: "grid", gap: "8px", background: "var(--surface-1)" }}>
          {result.input != null && (
            <IORow label="Input"    value={result.input}    color="var(--text-secondary)" />
          )}
          {result.expected != null && (
            <IORow label="Expected" value={result.expected} color="var(--color-green)" />
          )}
          {result.actual != null && (
            <IORow label="Got"      value={result.actual}   color="var(--color-red)" />
          )}
        </div>
      )}
    </div>
  );
}

function IORow({ label, value, color }) {
  return (
    <div>
      <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
      <pre style={{ margin: "4px 0 0", fontFamily: "var(--font-mono)", fontSize: "12px", color, background: "var(--surface-2)", padding: "6px 10px", borderRadius: "6px", overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
        {value || "(empty)"}
      </pre>
    </div>
  );
}

export default function VerdictPanel({ submissionId }) {
  const submission = useSelector(selectActiveSubmission);
  const status     = useSelector(selectActiveStatus);

  if (status === "idle") return null;

  if (status === "loading") {
    return (
      <div style={panelStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--text-muted)" }}>
          <Spinner size={18} /> Submitting…
        </div>
      </div>
    );
  }

  if (!submission) return null;

  const verdict = submission.verdict || "pending";
  const meta    = VERDICT_META[verdict] || VERDICT_META.pending;
  const isActive = verdict === "pending" || verdict === "running";

  return (
    <div style={panelStyle}>
      {/* Overall verdict badge */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: "16px", flexWrap: "wrap", gap: "8px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {isActive && <Spinner size={18} color={meta.color} />}
          <span style={{ fontSize: "20px", fontWeight: 700, color: meta.color }}>
            {meta.icon} {meta.label}
          </span>
        </div>
        {!isActive && submission.runtime != null && (
          <div style={{ display: "flex", gap: "16px", fontSize: "13px", color: "var(--text-muted)" }}>
            <span>⚡ {submission.runtime}ms</span>
            {submission.memory != null && <span>📦 {(submission.memory / 1024).toFixed(1)}MB</span>}
          </div>
        )}
      </div>

      {/* Compile error */}
      {verdict === "CE" && submission.compileError && (
        <div style={{ marginBottom: "16px" }}>
          <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "6px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Compile Error</div>
          <pre style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--color-orange)", background: "var(--surface-2)", padding: "12px", borderRadius: "8px", overflowX: "auto", whiteSpace: "pre-wrap" }}>
            {submission.compileError}
          </pre>
        </div>
      )}

      {/* Test case results */}
      {submission.testResults?.length > 0 && (
        <div>
          <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Test Results
            {" "}
            <span style={{ color: "var(--color-green)" }}>
              {submission.testResults.filter((r) => r.verdict === "AC").length}
            </span>
            {" / "}
            {submission.testResults.length} passed
          </div>
          {submission.testResults.map((r, i) => (
            <TestCaseRow key={i} result={r} index={i} />
          ))}
        </div>
      )}

      {/* Running placeholder */}
      {isActive && (
        <div style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "8px" }}>
          Waiting for judge…
        </div>
      )}
    </div>
  );
}

const panelStyle = {
  background: "var(--surface-1)",
  border: "1px solid var(--surface-border)",
  borderRadius: "12px",
  padding: "20px",
};
