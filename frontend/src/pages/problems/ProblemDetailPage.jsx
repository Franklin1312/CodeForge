import { useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchProblemBySlug,
  clearCurrentProblem,
  selectCurrentProblem,
  selectDetailStatus,
  selectDetailError,
} from "../../store/slices/problemsSlice.js";
import { Spinner } from "../../components/ui/index.jsx";
import { selectIsAuthenticated } from "../../store/slices/authSlice.js";

const DIFFICULTY_COLORS = {
  easy:   { bg: "rgba(0,230,118,0.12)",  text: "#00e676" },
  medium: { bg: "rgba(255,109,0,0.12)",  text: "#ff6d00" },
  hard:   { bg: "rgba(255,23,68,0.12)",  text: "#ff1744" },
};

export default function ProblemDetailPage() {
  const { slug } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const problem       = useSelector(selectCurrentProblem);
  const status        = useSelector(selectDetailStatus);
  const error         = useSelector(selectDetailError);
  const isAuthenticated = useSelector(selectIsAuthenticated);

  useEffect(() => {
    dispatch(fetchProblemBySlug(slug));
    return () => dispatch(clearCurrentProblem());
  }, [slug, dispatch]);

  if (status === "loading" || status === "idle") {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
        <Spinner size={36} color="var(--color-brand)" />
      </div>
    );
  }

  if (error || status === "failed") {
    return (
      <div style={{ textAlign: "center", padding: "80px 24px" }}>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔍</div>
        <h2 style={{ color: "var(--text-primary)", marginBottom: "8px" }}>Problem not found</h2>
        <p style={{ color: "var(--text-muted)", marginBottom: "24px" }}>{error}</p>
        <Link to="/problems" style={{ color: "var(--color-brand)" }}>← Back to problems</Link>
      </div>
    );
  }

  if (!problem) return null;

  const dc = DIFFICULTY_COLORS[problem.difficulty] || {};

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "28px 24px", display: "flex", gap: "28px" }}>

      {/* ─── Problem description panel ────────────────── */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Breadcrumb */}
        <div style={{ marginBottom: "20px", fontSize: "13px", color: "var(--text-muted)" }}>
          <Link to="/problems" style={{ color: "var(--text-muted)", textDecoration: "none" }}>Problems</Link>
          {" / "}
          <span style={{ color: "var(--text-primary)" }}>{problem.title}</span>
        </div>

        {/* Title + badges */}
        <div style={{ marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "12px" }}>
            <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)" }}>
              {problem.title}
            </h1>
            <span style={{ background: dc.bg, color: dc.text, padding: "3px 12px", borderRadius: "99px", fontSize: "13px", fontWeight: 600, textTransform: "capitalize" }}>
              {problem.difficulty}
            </span>
            {problem.isPremium && (
              <span style={{ background: "rgba(156,39,176,0.12)", color: "var(--color-purple)", padding: "3px 10px", borderRadius: "99px", fontSize: "12px", fontWeight: 600 }}>
                Premium
              </span>
            )}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {problem.tags?.map((tag) => (
              <Link
                key={tag}
                to={`/problems?tags=${tag}`}
                style={{ fontSize: "12px", padding: "2px 8px", borderRadius: "99px", background: "var(--surface-2)", color: "var(--text-muted)", textDecoration: "none", border: "1px solid var(--surface-border)" }}
              >
                {tag}
              </Link>
            ))}
          </div>
        </div>

        {/* Stats bar */}
        <div style={{ display: "flex", gap: "24px", padding: "12px 16px", background: "var(--surface-1)", borderRadius: "10px", marginBottom: "24px", fontSize: "13px" }}>
          <span style={{ color: "var(--text-muted)" }}>
            Acceptance: <strong style={{ color: "var(--text-primary)" }}>{problem.stats?.acceptanceRate?.toFixed(1) ?? 0}%</strong>
          </span>
          <span style={{ color: "var(--text-muted)" }}>
            Submissions: <strong style={{ color: "var(--text-primary)" }}>{problem.stats?.totalSubmissions ?? 0}</strong>
          </span>
          <span style={{ color: "var(--text-muted)" }}>
            Time limit: <strong style={{ color: "var(--text-primary)" }}>{problem.timeLimit}ms</strong>
          </span>
          <span style={{ color: "var(--text-muted)" }}>
            Memory: <strong style={{ color: "var(--text-primary)" }}>{problem.memoryLimit}MB</strong>
          </span>
        </div>

        {/* Description */}
        <div style={{ fontSize: "15px", lineHeight: "1.75", color: "var(--text-secondary)", marginBottom: "28px", whiteSpace: "pre-wrap" }}>
          {problem.description}
        </div>

        {/* Examples */}
        {problem.examples?.length > 0 && (
          <div style={{ marginBottom: "28px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "16px" }}>Examples</h2>
            {problem.examples.map((ex, i) => (
              <div key={i} style={{ background: "var(--surface-1)", border: "1px solid var(--surface-border)", borderRadius: "10px", padding: "16px", marginBottom: "12px" }}>
                <div style={{ marginBottom: "8px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>Example {i + 1}</span>
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "13px", marginBottom: "8px" }}>
                  <span style={{ color: "var(--text-muted)" }}>Input: </span>
                  <span style={{ color: "var(--color-brand)" }}>{ex.input}</span>
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "13px", marginBottom: ex.explanation ? "8px" : 0 }}>
                  <span style={{ color: "var(--text-muted)" }}>Output: </span>
                  <span style={{ color: "var(--color-green)" }}>{ex.output}</span>
                </div>
                {ex.explanation && (
                  <div style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "8px", borderTop: "1px solid var(--surface-border)", paddingTop: "8px" }}>
                    {ex.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Constraints */}
        {problem.constraints && (
          <div style={{ marginBottom: "28px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "12px" }}>Constraints</h2>
            <div style={{ background: "var(--surface-1)", border: "1px solid var(--surface-border)", borderRadius: "10px", padding: "16px", fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--text-secondary)", whiteSpace: "pre-wrap" }}>
              {problem.constraints}
            </div>
          </div>
        )}
      </div>

      {/* ─── Right panel: editor placeholder + actions ─── */}
      <div style={{ width: "360px", flexShrink: 0 }}>
        <div style={{ position: "sticky", top: "76px" }}>
          <div style={{ background: "var(--surface-1)", border: "1px solid var(--surface-border)", borderRadius: "12px", padding: "20px", marginBottom: "16px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "16px" }}>
              Languages
            </h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "20px" }}>
              {(problem.allowedLanguages || []).map((lang) => (
                <span key={lang} style={{ fontSize: "12px", padding: "3px 10px", borderRadius: "6px", background: "var(--surface-2)", color: "var(--text-secondary)", border: "1px solid var(--surface-border)" }}>
                  {lang}
                </span>
              ))}
            </div>

            {isAuthenticated ? (
              <button
                onClick={() => navigate(`/problems/${slug}/solve`)}
                style={{
                  width: "100%", padding: "11px", borderRadius: "8px",
                  background: "var(--color-brand)", color: "#0f1117",
                  fontSize: "15px", fontWeight: 700, border: "none", cursor: "pointer",
                  transition: "opacity 150ms",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              >
                ⚡ Solve Problem
              </button>
            ) : (
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "12px" }}>
                  Sign in to submit solutions
                </p>
                <Link
                  to={`/login?from=/problems/${slug}`}
                  style={{
                    display: "block", padding: "11px", borderRadius: "8px",
                    background: "var(--color-brand)", color: "#0f1117",
                    fontSize: "15px", fontWeight: 700, textDecoration: "none", textAlign: "center",
                  }}
                >
                  Sign in to solve
                </Link>
              </div>
            )}
          </div>

          {/* Test cases count */}
          <div style={{ background: "var(--surface-1)", border: "1px solid var(--surface-border)", borderRadius: "12px", padding: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
              <span style={{ color: "var(--text-muted)" }}>Test cases</span>
              <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{problem.testCases?.length ?? 0} public</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
