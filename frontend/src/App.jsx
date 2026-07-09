import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useAuth } from "./hooks/useAuth.js";

import Layout               from "./components/layout/Layout.jsx";
import { ProtectedRoute, PublicOnlyRoute } from "./components/auth/ProtectedRoute.jsx";

import HomePage             from "./pages/HomePage.jsx";
import NotFoundPage         from "./pages/NotFoundPage.jsx";
import LoginPage            from "./pages/auth/LoginPage.jsx";
import RegisterPage         from "./pages/auth/RegisterPage.jsx";
import ProblemsPage         from "./pages/problems/ProblemsPage.jsx";
import ProblemDetailPage    from "./pages/problems/ProblemDetailPage.jsx";
import SolvePage            from "./pages/problems/SolvePage.jsx";
import AiCoachPage          from "./pages/ai/AiCoachPage.jsx";
import AdminDashboard       from "./pages/admin/AdminDashboard.jsx";
import AdminProblemsPage    from "./pages/admin/AdminProblemsPage.jsx";
import ProblemFormPage      from "./pages/admin/ProblemFormPage.jsx";
import JudgeStatusPage      from "./pages/admin/JudgeStatusPage.jsx";

function AppRoutes() {
  const { rehydrate } = useAuth();
  useEffect(() => { rehydrate(); }, []); // eslint-disable-line

  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Public */}
        <Route path="/"         element={<HomePage />} />
        <Route path="/login"    element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
        <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />

        {/* Problems */}
        <Route path="/problems"              element={<ProblemsPage />} />
        <Route path="/problems/:slug"        element={<ProblemDetailPage />} />
        <Route path="/problems/:slug/solve"  element={<ProtectedRoute><SolvePage /></ProtectedRoute>} />

        {/* AI Coach */}
        <Route path="/ai-coach" element={<ProtectedRoute><AiCoachPage /></ProtectedRoute>} />

        {/* Admin */}
        <Route path="/admin"                    element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/problems"           element={<ProtectedRoute requiredRole="admin"><AdminProblemsPage /></ProtectedRoute>} />
        <Route path="/admin/problems/new"       element={<ProtectedRoute requiredRole="admin"><ProblemFormPage /></ProtectedRoute>} />
        <Route path="/admin/problems/:id/edit"  element={<ProtectedRoute requiredRole="admin"><ProblemFormPage /></ProtectedRoute>} />
        <Route path="/admin/judge"              element={<ProtectedRoute requiredRole="admin"><JudgeStatusPage /></ProtectedRoute>} />

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
