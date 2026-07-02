import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div style={{ textAlign: "center", marginTop: "120px", padding: "0 24px" }}>
      <div style={{ fontSize: "72px", fontWeight: 700, color: "var(--color-brand)" }}>404</div>
      <p style={{ color: "var(--text-secondary)", margin: "16px 0 32px" }}>Page not found</p>
      <Link to="/" style={{ color: "var(--color-brand)" }}>← Back to home</Link>
    </div>
  );
}
