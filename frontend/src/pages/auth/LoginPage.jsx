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
      await login(
        { email: form.email, password: form.password },
        { redirectTo: from || "/problems" }
      );
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

        <p style={{ textAlign: "center", marginTop: "28px", fontSize: "14px", color: "var(--text-muted)" }}>
          Don&apos;t have an account?{" "}
          <Link to="/register" style={{ color: "var(--color-brand)", fontWeight: 500 }}>
            Create one free
          </Link>
        </p>
      </div>
    </div>
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