import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "../../store/slices/authSlice.js";

const tiles = [
  { to: "/admin/problems",     icon: "📚", label: "Problems",    desc: "Create, edit, publish problems" },
  { to: "/admin/users",        icon: "👥", label: "Users",       desc: "Manage users and roles" },
  { to: "/problems",           icon: "🌐", label: "View Site",   desc: "See the public problem list" },
];

export default function AdminDashboard() {
  const user = useSelector(selectCurrentUser);

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "40px 24px" }}>
      <h1 style={{ fontSize: "26px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "6px" }}>
        Admin Panel
      </h1>
      <p style={{ fontSize: "14px", color: "var(--text-muted)", marginBottom: "36px" }}>
        Signed in as <strong style={{ color: "var(--color-orange)" }}>{user?.username}</strong> · {user?.role}
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "16px" }}>
        {tiles.map(({ to, icon, label, desc }) => (
          <Link
            key={to}
            to={to}
            style={{
              display: "block", padding: "24px",
              background: "var(--surface-1)", border: "1px solid var(--surface-border)",
              borderRadius: "12px", textDecoration: "none",
              transition: "border-color 150ms, transform 150ms",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--color-brand)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--surface-border)"; e.currentTarget.style.transform = "none"; }}
          >
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>{icon}</div>
            <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>{label}</div>
            <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>{desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
