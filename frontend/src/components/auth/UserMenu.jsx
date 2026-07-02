import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";

export default function UserMenu() {
  const { user, logout, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handler(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const initial = user?.username?.[0]?.toUpperCase() || "?";

  return (
    <div ref={menuRef} style={{ position: "relative" }}>
      {/* Avatar trigger */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="User menu"
        aria-expanded={open}
        style={{
          width: "34px",
          height: "34px",
          borderRadius: "50%",
          background: "var(--color-brand)",
          color: "#0f1117",
          fontWeight: 700,
          fontSize: "14px",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {user?.avatar ? (
          <img
            src={user.avatar}
            alt={user.username}
            style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
          />
        ) : initial}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 8px)",
            background: "var(--surface-2)",
            border: "1px solid var(--surface-border)",
            borderRadius: "10px",
            minWidth: "200px",
            boxShadow: "var(--shadow-lg)",
            zIndex: 200,
            overflow: "hidden",
          }}
        >
          {/* User info header */}
          <div style={{
            padding: "14px 16px",
            borderBottom: "1px solid var(--surface-border)",
          }}>
            <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--text-primary)" }}>
              {user?.username}
            </div>
            <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
              {user?.email}
            </div>
            {user?.role !== "user" && (
              <span style={{
                display: "inline-block",
                marginTop: "6px",
                fontSize: "10px",
                fontWeight: 600,
                padding: "2px 7px",
                borderRadius: "99px",
                background: user.role === "admin" ? "rgba(255,109,0,0.15)" : "rgba(156,39,176,0.15)",
                color: user.role === "admin" ? "var(--color-orange)" : "var(--color-purple)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}>
                {user.role}
              </span>
            )}
          </div>

          {/* Menu items */}
          {[
            { to: `/profile/${user?.username}`, label: "My Profile", icon: "👤" },
            { to: "/submissions", label: "My Submissions", icon: "📋" },
            { to: "/settings", label: "Settings", icon: "⚙️" },
            ...(isAdmin ? [{ to: "/admin", label: "Admin Panel", icon: "🛡️" }] : []),
          ].map(({ to, label, icon }) => (
            <Link
              key={to}
              to={to}
              role="menuitem"
              onClick={() => setOpen(false)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 16px",
                fontSize: "14px",
                color: "var(--text-secondary)",
                textDecoration: "none",
                transition: "background 120ms",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-3)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span>{icon}</span>
              {label}
            </Link>
          ))}

          <div style={{ borderTop: "1px solid var(--surface-border)" }}>
            <button
              role="menuitem"
              onClick={() => { setOpen(false); logout(); }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                width: "100%",
                padding: "10px 16px",
                fontSize: "14px",
                color: "var(--color-red)",
                background: "none",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                transition: "background 120ms",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,23,68,0.08)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span>🚪</span>
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
