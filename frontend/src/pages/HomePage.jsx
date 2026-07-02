import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectIsAuthenticated, selectCurrentUser } from "../store/slices/authSlice.js";

export default function HomePage() {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectCurrentUser);

  return (
    <div style={{ maxWidth: "800px", margin: "80px auto", padding: "0 24px", textAlign: "center" }}>
      <div style={{ fontSize: "64px", marginBottom: "24px" }}>⚡</div>
      <h1 style={{ fontSize: "48px", fontWeight: 700, color: "var(--color-brand)", marginBottom: "16px" }}>
        CodeForge OJ
      </h1>
      <p style={{ fontSize: "20px", color: "var(--text-secondary)", marginBottom: "40px" }}>
        {isAuthenticated
          ? `Welcome back, ${user?.username}! Ready to solve some problems?`
          : "Competitive programming platform with AI-powered coaching"}
      </p>

      <div style={{ display: "flex", gap: "16px", justifyContent: "center" }}>
        {isAuthenticated ? (
          <Link to="/problems" style={btnPrimary}>Browse Problems</Link>
        ) : (
          <>
            <Link to="/register" style={btnPrimary}>Get started free</Link>
            <Link to="/login" style={btnOutline}>Sign in</Link>
          </>
        )}
      </div>

      {/* Build stage progress */}
      <div style={{ marginTop: "80px", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "16px" }}>
        {[
          { icon: "🏗️", label: "Stage 1", desc: "Project scaffold", done: true },
          { icon: "🔐", label: "Stage 2", desc: "JWT auth backend", done: true },
          { icon: "⚛️", label: "Stage 3", desc: "React auth frontend", done: true },
          { icon: "📚", label: "Stage 4", desc: "Problem service", done: false },
          { icon: "💻", label: "Stage 5", desc: "Monaco + submissions", done: false },
          { icon: "🐳", label: "Stage 6", desc: "Docker judge", done: false },
        ].map((s) => (
          <div key={s.label} style={{
            background: "var(--surface-1)",
            border: `1px solid ${s.done ? "var(--color-brand)" : "var(--surface-border)"}`,
            borderRadius: "12px",
            padding: "20px",
          }}>
            <div style={{ fontSize: "28px", marginBottom: "8px" }}>{s.icon}</div>
            <div style={{ fontWeight: 600, color: s.done ? "var(--color-brand)" : "var(--text-secondary)" }}>
              {s.label} {s.done && "✓"}
            </div>
            <div style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>{s.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const btnPrimary = {
  background: "var(--color-brand)", color: "#0f1117",
  padding: "12px 32px", borderRadius: "8px",
  fontSize: "16px", fontWeight: 600, textDecoration: "none",
};
const btnOutline = {
  border: "1px solid var(--surface-border)", color: "var(--text-primary)",
  padding: "12px 32px", borderRadius: "8px",
  fontSize: "16px", textDecoration: "none",
};
