import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";
import { Input, Button, Alert, Divider } from "../../components/ui/index.jsx";

export default function LoginPage() {
  const { login, isLoading } = useAuth();
  const location = useLocation();
  const from = location.state?.from?.pathname;

  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    // Clear field error on change
    if (errors[name]) setErrors((e) => ({ ...e, [name]: "" }));
    if (serverError) setServerError("");
  }

  function validate() {
    const errs = {};
    if (!form.email) errs.email = "Email is required";
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = "Invalid email address";
    if (!form.password) errs.password = "Password is required";
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    try {
      await login({ email: form.email, password: form.password });
      // useAuth.login navigates to /problems (or `from` if we pass it through)
    } catch (err) {
      const apiErrors = err.response?.data?.error?.details;
      if (apiErrors) {
        const fieldErrors = {};
        apiErrors.forEach(({ field, message }) => { fieldErrors[field] = message; });
        setErrors(fieldErrors);
      } else {
        setServerError(err.response?.data?.error?.message || "Login failed. Please try again.");
      }
    }
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ fontSize: "36px", marginBottom: "12px" }}>⚡</div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "6px" }}>
            Sign in to CodeForge
          </h1>
          <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>
            {from
              ? "Sign in to continue"
              : "Welcome back — continue your coding journey"}
          </p>
        </div>

        {serverError && (
          <div style={{ marginBottom: "20px" }}>
            <Alert type="error">{serverError}</Alert>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <Input
              label="Email"
              type="email"
              name="email"
              id="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              error={errors.email}
              required
            />

            <div>
              <Input
                label="Password"
                type="password"
                name="password"
                id="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                error={errors.password}
                required
              />
              <div style={{ textAlign: "right", marginTop: "6px" }}>
                <Link
                  to="/forgot-password"
                  style={{ fontSize: "12px", color: "var(--text-muted)" }}
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button
              type="submit"
              fullWidth
              size="lg"
              isLoading={isLoading}
            >
              {isLoading ? "Signing in…" : "Sign in"}
            </Button>
          </div>
        </form>

        <div style={{ marginTop: "24px" }}>
          <Divider label="or" />
        </div>

        {/* OAuth buttons — wired in Stage 3b */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "20px" }}>
          <OAuthButton provider="github" label="Continue with GitHub" />
          <OAuthButton provider="google" label="Continue with Google" />
        </div>

        <p style={{ textAlign: "center", marginTop: "28px", fontSize: "14px", color: "var(--text-muted)" }}>
          Don't have an account?{" "}
          <Link to="/register" style={{ color: "var(--color-brand)", fontWeight: 500 }}>
            Create one free
          </Link>
        </p>
      </div>
    </div>
  );
}

function OAuthButton({ provider, label }) {
  const icons = {
    github: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
      </svg>
    ),
    google: (
      <svg width="18" height="18" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
    ),
  };

  return (
    <button
      type="button"
      onClick={() => window.location.href = `/api/auth/oauth/${provider}`}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
        width: "100%",
        padding: "10px",
        background: "var(--surface-2)",
        border: "1px solid var(--surface-border)",
        borderRadius: "8px",
        color: "var(--text-primary)",
        fontSize: "14px",
        fontWeight: 500,
        cursor: "pointer",
        transition: "border-color 150ms",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--text-muted)")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--surface-border)")}
    >
      {icons[provider]}
      {label}
    </button>
  );
}

// ─── Styles ───────────────────────────────────────────────────────
const pageStyle = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px",
  background: "var(--surface-base)",
};

const cardStyle = {
  width: "100%",
  maxWidth: "420px",
  background: "var(--surface-1)",
  border: "1px solid var(--surface-border)",
  borderRadius: "16px",
  padding: "40px 36px",
};
