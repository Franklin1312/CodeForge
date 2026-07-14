import { Link, NavLink } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectIsAuthenticated } from "../../store/slices/authSlice.js";
import UserMenu from "../auth/UserMenu.jsx";
import { Button } from "../ui/index.jsx";

const navLinks = [
  { to: "/problems", label: "Problems" },
  { to: "/ai-coach",  label: "AI Coach" },
  { to: "/leaderboard", label: "Leaderboard" },
];

export default function Navbar() {
  const isAuthenticated = useSelector(selectIsAuthenticated);

  return (
    <header style={{
      background: "var(--surface-1)",
      borderBottom: "1px solid var(--border)",
      padding: "0 24px",
      height: "58px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      position: "sticky",
      top: 0,
      zIndex: 100,
    }}>
      {/* Brand mark */}
      <Link to="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
        <span style={{
          width: "28px", height: "28px", borderRadius: "6px",
          background: "var(--brand)", color: "var(--brand-ink)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "15px",
        }}>{"</>"}</span>
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "17px", color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
          CodeForge<span style={{ color: "var(--brand)" }}>_</span>
        </span>
      </Link>

      {/* Nav links */}
      <nav style={{ display: "flex", alignItems: "center", gap: "2px" }}>
        {navLinks.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => ({
              padding: "6px 14px",
              borderRadius: "var(--radius-sm)",
              fontSize: "13px",
              fontFamily: "var(--font-mono)",
              fontWeight: isActive ? 600 : 400,
              color: isActive ? "var(--brand)" : "var(--text-secondary)",
              background: isActive ? "var(--brand-tint)" : "transparent",
              textDecoration: "none",
              transition: "all 150ms",
            })}
          >
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Auth area */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {isAuthenticated ? (
          <UserMenu />
        ) : (
          <>
            <Link to="/login"><Button variant="ghost" size="sm">Sign in</Button></Link>
            <Link to="/register"><Button size="sm">Get started</Button></Link>
          </>
        )}
      </div>
    </header>
  );
}
