import { useSelector } from "react-redux";
import { selectActiveSubmission, selectActiveStatus } from "../../store/slices/submissionsSlice.js";
import { Spinner, VerdictStamp } from "../ui/index.jsx";

const VERDICT_META = {
  pending: { color: "var(--v-pending)", icon: "○", label: "Pending" },
  running: { color: "var(--v-running)", icon: "◐", label: "Judging" },
  AC:      { color: "var(--v-ac)",  icon: "✓", label: "Accepted" },
  WA:      { color: "var(--v-wa)",  icon: "✕", label: "Wrong Answer" },
  TLE:     { color: "var(--v-tle)", icon: "⏱", label: "Time Limit" },
  MLE:     { color: "var(--v-mle)", icon: "▣", label: "Memory Limit" },
  RE:      { color: "var(--v-re)",  icon: "!", label: "Runtime Error" },
  CE:      { color: "var(--v-ce)",  icon: "⚠", label: "Compile Error" },
  SE:      { color: "var(--v-se)",  icon: "?", label: "System Error" },
};

function TestCaseRow({ result, index }) {
  const meta = VERDICT_META[result.verdict] || VERDICT_META.SE;
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", overflow: "hidden", marginBottom: "8px" }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "8px 14px",
        background: result.verdict === "AC" ? "rgba(63,185,80,0.06)" : "rgba(240,96,90,0.06)",
      }}>
        <span style={{ fontSize: "13px", fontWeight: 600, color: meta.color, fontFamily: "var(--font-mono)" }}>
          {meta.icon} Test {index + 1}
          {result.isHidden && <span style={{ marginLeft: "8px", fontSize: "11px", color: "var(--text-muted)", fontWeight: 400 }}>hidden</span>}
        </span>
        <div style={{ display: "flex", gap: "14px", fontSize: "12px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
          {result.runtime != null && <span>{result.runtime}ms</span>}
          {result.memory  != null && <span>{(result.memory / 1024).toFixed(1)}MB</span>}
          <span style={{ color: meta.color, fontWeight: 600 }}>{meta.label}</span>
        </div>
      </div>

      {!result.isHidden && result.verdict === "WA" && (
        <div style={{ padding: "12px 14px", display: "grid", gap: "8px", background: "var(--surface-1)" }}>
          {result.input    != null && <IORow label="Input"    value={result.input}    color="var(--text-secondary)" />}
          {result.expected != null && <IORow label="Expected" value={result.expected} color="var(--v-ac)" />}
          {result.actual   != null && <IORow label="Got"      value={result.actual}   color="var(--v-wa)" />}
        </div>
      )}
    </div>
  );
}

function IORow({ label, value, color }) {
  return (
    <div>
      <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "var(--font-mono)" }}>{label}</span>
      <pre style={{ margin: "4px 0 0", fontFamily: "var(--font-mono)", fontSize: "12px", color, background: "var(--surface-2)", padding: "6px 10px", borderRadius: "var(--radius-sm)", overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
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
        <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "13px" }}>
          <Spinner size={18} /> submitting...
        </div>
      </div>
    );
  }

  if (!submission) return null;

  const verdict  = submission.verdict || "pending";
  const meta     = VERDICT_META[verdict] || VERDICT_META.pending;
  const isActive = verdict === "pending" || verdict === "running";
  const isFinal  = !isActive;

  return (
    <div style={panelStyle}>
      {/* Overall verdict — the signature stamp for final results */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px", flexWrap: "wrap", gap: "10px" }}>
        {isFinal ? (
          <VerdictStamp verdict={verdict} animate />
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Spinner size={18} color={meta.color} />
            <span style={{ fontSize: "15px", fontWeight: 600, color: meta.color, fontFamily: "var(--font-mono)" }}>
              {meta.label}...
            </span>
          </div>
        )}
        {isFinal && submission.runtime != null && (
          <div style={{ display: "flex", gap: "16px", fontSize: "13px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
            <span>{submission.runtime}ms</span>
            {submission.memory != null && <span>{(submission.memory / 1024).toFixed(1)}MB</span>}
          </div>
        )}
      </div>

      {verdict === "CE" && submission.compileError && (
        <div style={{ marginBottom: "16px" }}>
          <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "6px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "var(--font-mono)" }}>Compile Error</div>
          <pre style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--v-ce)", background: "var(--surface-2)", padding: "12px", borderRadius: "var(--radius-sm)", overflowX: "auto", whiteSpace: "pre-wrap" }}>
            {submission.compileError}
          </pre>
        </div>
      )}

      {submission.testResults?.length > 0 && (
        <div>
          <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "var(--font-mono)" }}>
            Test Results{" "}
            <span style={{ color: "var(--v-ac)" }}>{submission.testResults.filter((r) => r.verdict === "AC").length}</span>
            {" / "}{submission.testResults.length} passed
          </div>
          {submission.testResults.map((r, i) => <TestCaseRow key={i} result={r} index={i} />)}
        </div>
      )}

      {isActive && (
        <div style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "8px", fontFamily: "var(--font-mono)" }}>
          waiting for judge...
        </div>
      )}
    </div>
  );
}

const panelStyle = {
  background: "var(--surface-1)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-lg)",
  padding: "20px",
};
