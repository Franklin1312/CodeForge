import { Link, NavLink } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectIsAuthenticated } from "../../store/slices/authSlice.js";
import UserMenu from "../auth/UserMenu.jsx";
import { Button } from "../ui/index.jsx";

const navLinks = [
  { to: "/problems", label: "Problems" },
    { to: "/ai-coach", label: "AI Coach" },
  { to: "/leaderboard", label: "Leaderboard" },
];

export default function Navbar() {
  const isAuthenticated = useSelector(selectIsAuthenticated);

  return (
    <header style={{
      background: "var(--surface-1)",
      borderBottom: "1px solid var(--surface-border)",
      padding: "0 24px",
      height: "56px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      position: "sticky",
      top: 0,
      zIndex: 100,
    }}>
      {/* Logo */}
      <Link to="/" style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none" }}>
        <span style={{ fontSize: "20px" }}>⚡</span>
        <span style={{ fontWeight: 700, fontSize: "18px", color: "var(--color-brand)" }}>CodeForge</span>
      </Link>

      {/* Nav links */}
      <nav style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        {navLinks.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => ({
              padding: "6px 12px",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: isActive ? 500 : 400,
              color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
              background: isActive ? "var(--surface-2)" : "transparent",
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
            <Link to="/login">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link to="/register">
              <Button size="sm">Get started</Button>
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
