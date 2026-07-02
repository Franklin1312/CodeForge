import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";
import { Input, Button, Alert, Divider } from "../../components/ui/index.jsx";

const PASSWORD_RULES = [
  { test: (p) => p.length >= 8,    label: "At least 8 characters" },
  { test: (p) => /[A-Z]/.test(p),  label: "One uppercase letter" },
  { test: (p) => /[0-9]/.test(p),  label: "One number" },
];

function PasswordStrength({ password }) {
  if (!password) return null;
  const passed = PASSWORD_RULES.filter((r) => r.test(password)).length;
  const colors = ["var(--color-red)", "var(--color-orange)", "var(--color-green)"];
  const labels = ["Weak", "Fair", "Strong"];

  return (
    <div style={{ marginTop: "8px" }}>
      <div style={{ display: "flex", gap: "4px", marginBottom: "6px" }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: "3px",
              borderRadius: "2px",
              background: i < passed ? colors[passed - 1] : "var(--surface-border)",
              transition: "background 250ms",
            }}
          />
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
        {PASSWORD_RULES.map((rule) => (
          <span
            key={rule.label}
            style={{
              fontSize: "11px",
              color: rule.test(password) ? "var(--color-green)" : "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            {rule.test(password) ? "✓" : "○"} {rule.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const { register, isLoading } = useAuth();

  const [form, setForm] = useState({ username: "", email: "", password: "", confirmPassword: "" });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((e) => ({ ...e, [name]: "" }));
    if (serverError) setServerError("");
  }

  function validate() {
    const errs = {};
    if (!form.username) {
      errs.username = "Username is required";
    } else if (!/^[a-zA-Z0-9_-]{3,30}$/.test(form.username)) {
      errs.username = "3–30 chars, letters/numbers/_ only";
    }
    if (!form.email) {
      errs.email = "Email is required";
    } else if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      errs.email = "Invalid email address";
    }
    if (!form.password) {
      errs.password = "Password is required";
    } else if (!PASSWORD_RULES.every((r) => r.test(form.password))) {
      errs.password = "Password doesn't meet requirements";
    }
    if (form.password !== form.confirmPassword) {
      errs.confirmPassword = "Passwords do not match";
    }
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
      await register({
        username: form.username,
        email: form.email,
        password: form.password,
      });
    } catch (err) {
      const apiErrors = err.response?.data?.error?.details;
      if (apiErrors) {
        const fieldErrors = {};
        apiErrors.forEach(({ field, message }) => { fieldErrors[field] = message; });
        setErrors(fieldErrors);
      } else {
        setServerError(err.response?.data?.error?.message || "Registration failed. Please try again.");
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
            Create your account
          </h1>
          <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>
            Free forever — no credit card required
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
              label="Username"
              type="text"
              name="username"
              id="username"
              autoComplete="username"
              placeholder="coolcoder42"
              value={form.username}
              onChange={handleChange}
              error={errors.username}
              hint="Letters, numbers, _ and - only"
              required
            />

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
                autoComplete="new-password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                error={errors.password}
                required
              />
              <PasswordStrength password={form.password} />
            </div>

            <Input
              label="Confirm password"
              type="password"
              name="confirmPassword"
              id="confirmPassword"
              autoComplete="new-password"
              placeholder="••••••••"
              value={form.confirmPassword}
              onChange={handleChange}
              error={errors.confirmPassword}
              required
            />

            <Button
              type="submit"
              fullWidth
              size="lg"
              isLoading={isLoading}
            >
              {isLoading ? "Creating account…" : "Create account"}
            </Button>
          </div>
        </form>

        <p style={{ textAlign: "center", fontSize: "11px", color: "var(--text-muted)", marginTop: "16px" }}>
          By creating an account you agree to our{" "}
          <Link to="/terms" style={{ color: "var(--text-muted)", textDecoration: "underline" }}>Terms</Link>
          {" "}and{" "}
          <Link to="/privacy" style={{ color: "var(--text-muted)", textDecoration: "underline" }}>Privacy Policy</Link>
        </p>

        <div style={{ marginTop: "20px" }}>
          <Divider label="or" />
        </div>

        <p style={{ textAlign: "center", marginTop: "20px", fontSize: "14px", color: "var(--text-muted)" }}>
          Already have an account?{" "}
          <Link to="/login" style={{ color: "var(--color-brand)", fontWeight: 500 }}>
            Sign in
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
