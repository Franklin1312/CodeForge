import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Editor from "@monaco-editor/react";

import {
  fetchProblemBySlug,
  clearCurrentProblem,
  selectCurrentProblem,
  selectDetailStatus,
} from "../../store/slices/problemsSlice.js";
import {
  submitCode,
  clearActive,
  selectActiveSubmission,
  selectActiveStatus,
  selectSubmissionsError,
} from "../../store/slices/submissionsSlice.js";

import { useSubmissionWebSocket } from "../../hooks/useWebSocket.js";
import VerdictPanel      from "../../components/editor/VerdictPanel.jsx";
import LanguageSelector  from "../../components/editor/LanguageSelector.jsx";
import { Button, Spinner } from "../../components/ui/index.jsx";
import toast from "react-hot-toast";

// ─── Starter code defaults ────────────────────────────────────────
const FALLBACK_STARTER = {
  python:     "# Write your solution here\n",
  javascript: "// Write your solution here\n",
  java:       "class Solution {\n    // Write your solution here\n}\n",
  cpp:        "#include <bits/stdc++.h>\nusing namespace std;\n\n// Write your solution here\n",
  go:         "package main\n\n// Write your solution here\n",
  rust:       "fn main() {\n    // Write your solution here\n}\n",
};

const MONACO_LANG = {
  python: "python", javascript: "javascript", java: "java",
  cpp: "cpp", go: "go", rust: "rust",
};

const DIFFICULTY_COLORS = {
  easy:   "#00e676",
  medium: "#ff6d00",
  hard:   "#ff1744",
};

export default function SolvePage() {
  const { slug }    = useParams();
  const dispatch    = useDispatch();
  const navigate    = useNavigate();

  const problem     = useSelector(selectCurrentProblem);
  const detailStatus= useSelector(selectDetailStatus);
  const submission  = useSelector(selectActiveSubmission);
  const activeStatus= useSelector(selectActiveStatus);
  const submitError = useSelector(selectSubmissionsError);

  const [language, setLanguage] = useState("python");
  const [code, setCode]         = useState("");
  const [activeTab, setActiveTab] = useState("description"); // description | submissions
  const [resultTab, setResultTab] = useState("verdict");    // verdict

  const editorRef = useRef(null);

  // Load problem
  useEffect(() => {
    dispatch(fetchProblemBySlug(slug));
    dispatch(clearActive());
    return () => dispatch(clearCurrentProblem());
  }, [slug, dispatch]);

  // Restore code from localStorage when problem/language changes
  useEffect(() => {
    if (!problem) return;
    const saved = localStorage.getItem(`cf-code:${problem._id}:${language}`);
    const starter = problem.starterCode?.[language] || FALLBACK_STARTER[language] || "";
    setCode(saved || starter);
  }, [problem?._id, language]);

  // Save code to localStorage on change (debounced via ref)
  const saveTimer = useRef(null);
  function handleCodeChange(val) {
    setCode(val || "");
    if (!problem) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      localStorage.setItem(`cf-code:${problem._id}:${language}`, val || "");
    }, 500);
  }

  // Switch language and load corresponding starter or saved code
  function handleLanguageChange(lang) {
    setLanguage(lang);
  }

  // Subscribe to live WebSocket updates for the active submission
  useSubmissionWebSocket(
    activeStatus === "judging" ? submission?.submissionId : null
  );

  // Submit handler
  const handleSubmit = useCallback(async () => {
    if (!problem || !code.trim()) {
      toast.error("Write some code first!");
      return;
    }
    dispatch(clearActive());
    setResultTab("verdict");

    const result = await dispatch(submitCode({
      problemId: problem._id,
      language,
      code,
    }));

    if (result.meta.requestStatus === "rejected") {
      toast.error(result.payload || "Submission failed");
    } else {
      toast.success("Code submitted — waiting for judge…");
    }
  }, [dispatch, problem, language, code]);

  // Keyboard shortcut: Ctrl+Enter / Cmd+Enter to submit
  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleSubmit]);

  if (detailStatus === "loading" || detailStatus === "idle") {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "80vh" }}>
        <Spinner size={36} color="var(--color-brand)" />
      </div>
    );
  }

  if (!problem) {
    return (
      <div style={{ textAlign: "center", padding: "80px 24px" }}>
        <p style={{ color: "var(--text-muted)" }}>Problem not found.</p>
        <Link to="/problems" style={{ color: "var(--color-brand)" }}>← Back</Link>
      </div>
    );
  }

  const diffColor = DIFFICULTY_COLORS[problem.difficulty] || "var(--text-muted)";
  const allowedLangs = problem.allowedLanguages || ["python"];
  const isSubmitting = activeStatus === "loading" || activeStatus === "judging";

  return (
    <div style={{ display: "flex", height: "calc(100vh - 56px)", overflow: "hidden" }}>

      {/* ─── Left panel: problem description ─────────────── */}
      <div style={{
        width: "420px", minWidth: "320px", flexShrink: 0,
        borderRight: "1px solid var(--surface-border)",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {/* Tab bar */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--surface-border)", background: "var(--surface-1)", flexShrink: 0 }}>
          {["description", "submissions"].map((t) => (
            <button key={t} onClick={() => setActiveTab(t)} style={{
              padding: "12px 18px", fontSize: "13px", fontWeight: 500,
              background: "none", border: "none", cursor: "pointer",
              color: activeTab === t ? "var(--text-primary)" : "var(--text-muted)",
              borderBottom: activeTab === t ? "2px solid var(--color-brand)" : "2px solid transparent",
              transition: "all 150ms", textTransform: "capitalize",
            }}>{t}</button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
          {activeTab === "description" && (
            <>
              {/* Title + difficulty */}
              <div style={{ marginBottom: "16px" }}>
                <h1 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "8px" }}>
                  {problem.title}
                </h1>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                  <span style={{ background: `${diffColor}18`, color: diffColor, padding: "2px 10px", borderRadius: "99px", fontSize: "12px", fontWeight: 600, textTransform: "capitalize" }}>
                    {problem.difficulty}
                  </span>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    {problem.stats?.acceptanceRate?.toFixed(1) ?? 0}% acceptance
                  </span>
                </div>
              </div>

              {/* Description */}
              <div style={{ fontSize: "14px", lineHeight: "1.75", color: "var(--text-secondary)", marginBottom: "24px", whiteSpace: "pre-wrap" }}>
                {problem.description}
              </div>

              {/* Examples */}
              {problem.examples?.map((ex, i) => (
                <div key={i} style={{ marginBottom: "16px" }}>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "8px" }}>
                    Example {i + 1}
                  </div>
                  <div style={{ background: "var(--surface-1)", border: "1px solid var(--surface-border)", borderRadius: "8px", padding: "12px", fontFamily: "var(--font-mono)", fontSize: "12px" }}>
                    <div style={{ marginBottom: "4px" }}><span style={{ color: "var(--text-muted)" }}>Input: </span><span style={{ color: "var(--color-brand)" }}>{ex.input}</span></div>
                    <div style={{ marginBottom: ex.explanation ? "4px" : 0 }}><span style={{ color: "var(--text-muted)" }}>Output: </span><span style={{ color: "var(--color-green)" }}>{ex.output}</span></div>
                    {ex.explanation && <div style={{ color: "var(--text-muted)", fontSize: "11px", marginTop: "6px", borderTop: "1px solid var(--surface-border)", paddingTop: "6px" }}>{ex.explanation}</div>}
                  </div>
                </div>
              ))}

              {/* Constraints */}
              {problem.constraints && (
                <div style={{ marginTop: "20px" }}>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "8px" }}>Constraints</div>
                  <div style={{ background: "var(--surface-1)", border: "1px solid var(--surface-border)", borderRadius: "8px", padding: "12px", fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text-secondary)", whiteSpace: "pre-wrap" }}>
                    {problem.constraints}
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === "submissions" && (
            <SubmissionsTab problemId={problem._id} />
          )}
        </div>
      </div>

      {/* ─── Right panel: editor + verdict ───────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

        {/* Editor toolbar */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "8px 16px", borderBottom: "1px solid var(--surface-border)",
          background: "var(--surface-1)", flexShrink: 0, gap: "12px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <LanguageSelector
              languages={allowedLangs}
              selected={language}
              onChange={handleLanguageChange}
            />
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              Time: {problem.timeLimit}ms · Memory: {problem.memoryLimit}MB
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>⌘↵ to submit</span>
            <Button
              onClick={handleSubmit}
              isLoading={isSubmitting}
              disabled={isSubmitting}
              size="sm"
            >
              {isSubmitting ? "Judging…" : "▶ Submit"}
            </Button>
          </div>
        </div>

        {/* Monaco editor */}
        <div style={{ flex: 1, overflow: "hidden" }}>
          <Editor
            language={MONACO_LANG[language] || "python"}
            value={code}
            onChange={handleCodeChange}
            onMount={(editor) => { editorRef.current = editor; }}
            theme="vs-dark"
            options={{
              fontSize: 14,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              fontLigatures: true,
              minimap:       { enabled: false },
              scrollBeyondLastLine: false,
              lineNumbers:   "on",
              wordWrap:      "off",
              tabSize:       4,
              automaticLayout: true,
              padding:       { top: 12 },
              scrollbar:     { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
            }}
          />
        </div>

        {/* Verdict panel */}
        {(activeStatus !== "idle") && (
          <div style={{
            borderTop: "1px solid var(--surface-border)",
            maxHeight: "340px", overflowY: "auto", padding: "16px",
            background: "var(--surface-base)",
          }}>
            <VerdictPanel submissionId={submission?.submissionId} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Submissions tab ──────────────────────────────────────────────
function SubmissionsTab({ problemId }) {
  const dispatch    = useDispatch();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!problemId) return;
    import("../../api/submissions.js").then(({ default: api }) =>
      api.getMine({ problemId, limit: 10 })
        .then((d) => setItems(d.submissions || []))
        .catch(() => {})
        .finally(() => setLoading(false))
    );
  }, [problemId]);

  const VERDICT_COLORS = {
    AC: "var(--color-green)", WA: "var(--color-red)",
    TLE: "var(--color-orange)", MLE: "var(--color-orange)",
    RE: "var(--color-red)", CE: "var(--color-orange)",
    pending: "var(--text-muted)", running: "var(--color-brand)",
    SE: "var(--text-muted)",
  };

  if (loading) return <div style={{ textAlign: "center", padding: "40px 0" }}><Spinner size={24} color="var(--color-brand)" /></div>;
  if (items.length === 0) return <p style={{ color: "var(--text-muted)", fontSize: "14px", textAlign: "center", marginTop: "40px" }}>No submissions yet for this problem.</p>;

  return (
    <div>
      <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "12px" }}>Your submissions</div>
      {items.map((s) => (
        <div key={s._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--surface-border)", fontSize: "13px" }}>
          <div>
            <span style={{ fontWeight: 700, color: VERDICT_COLORS[s.verdict] || "var(--text-muted)" }}>{s.verdict}</span>
            <span style={{ color: "var(--text-muted)", marginLeft: "10px", fontFamily: "var(--font-mono)", fontSize: "12px" }}>{s.language}</span>
          </div>
          <div style={{ color: "var(--text-muted)", fontSize: "12px" }}>
            {s.runtime != null ? `${s.runtime}ms` : "—"}
            {" · "}
            {new Date(s.createdAt).toLocaleDateString()}
          </div>
        </div>
      ))}
    </div>
  );
}
