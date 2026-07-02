import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  selectIsAuthenticated,
  selectAuthLoading,
  selectUserRole,
} from "../../store/slices/authSlice.js";
import { Spinner } from "../ui/index.jsx";

// ─── ProtectedRoute ───────────────────────────────────────────────
// Redirects to /login if the user is not authenticated.
// Preserves the original URL so the user is returned after login.
export function ProtectedRoute({ children, requiredRole = null }) {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isLoading = useSelector(selectAuthLoading);
  const role = useSelector(selectUserRole);
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
        <Spinner size={32} color="var(--color-brand)" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && role !== requiredRole && role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return children;
}

// ─── PublicOnlyRoute ─────────────────────────────────────────────
// Redirects already-authenticated users away from login/register.
export function PublicOnlyRoute({ children }) {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isLoading = useSelector(selectAuthLoading);

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
        <Spinner size={32} color="var(--color-brand)" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/problems" replace />;
  }

  return children;
}
