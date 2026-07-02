import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth.js";

// Layout
import Layout from "./components/layout/Layout.jsx";

// Auth guards
import { ProtectedRoute, PublicOnlyRoute } from "./components/auth/ProtectedRoute.jsx";

// Pages — Auth
import HomePage        from "./pages/HomePage.jsx";
import NotFoundPage    from "./pages/NotFoundPage.jsx";
import LoginPage       from "./pages/auth/LoginPage.jsx";
import RegisterPage    from "./pages/auth/RegisterPage.jsx";

// Pages — Problems (Stage 4)
import ProblemsPage      from "./pages/problems/ProblemsPage.jsx";
import ProblemDetailPage from "./pages/problems/ProblemDetailPage.jsx";

// Pages — Admin (Stage 4)
import AdminDashboard    from "./pages/admin/AdminDashboard.jsx";
import AdminProblemsPage from "./pages/admin/AdminProblemsPage.jsx";
import ProblemFormPage   from "./pages/admin/ProblemFormPage.jsx";

// Stage 5 — uncomment when built:
// import SolvePage from "./pages/problems/SolvePage.jsx";

function AppRoutes() {
  const { rehydrate } = useAuth();

  useEffect(() => {
    rehydrate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Routes>
      <Route element={<Layout />}>
        {/* ── Public ───────────────────────────────── */}
        <Route path="/" element={<HomePage />} />

        <Route path="/login"    element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
        <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />

        {/* ── Problems (public list, protected solve) */}
        <Route path="/problems"     element={<ProblemsPage />} />
        <Route path="/problems/:slug" element={<ProblemDetailPage />} />

        {/* Stage 5: */}
        {/* <Route path="/problems/:slug/solve" element={<ProtectedRoute><SolvePage /></ProtectedRoute>} /> */}

        {/* ── Admin ────────────────────────────────── */}
        <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/problems" element={<ProtectedRoute requiredRole="admin"><AdminProblemsPage /></ProtectedRoute>} />
        <Route path="/admin/problems/new" element={<ProtectedRoute requiredRole="admin"><ProblemFormPage /></ProtectedRoute>} />
        <Route path="/admin/problems/:id/edit" element={<ProtectedRoute requiredRole="admin"><ProblemFormPage /></ProtectedRoute>} />

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
