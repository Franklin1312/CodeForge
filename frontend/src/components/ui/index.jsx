import { forwardRef } from "react";

// ─── Input ────────────────────────────────────────────────────────
export const Input = forwardRef(function Input(
  { label, error, hint, className, id, required, mono, ...props },
  ref
) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{
            fontSize: "12px",
            fontWeight: 600,
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.03em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
          }}
        >
          {label}
          {required && <span style={{ color: "var(--v-wa)", marginLeft: "4px" }}>*</span>}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        required={required}
        style={{
          background: "var(--surface-2)",
          border: `1px solid ${error ? "var(--v-wa)" : "var(--border)"}`,
          borderRadius: "var(--radius-sm)",
          padding: "10px 14px",
          fontSize: "14px",
          fontFamily: mono ? "var(--font-mono)" : "var(--font-sans)",
          color: "var(--text-primary)",
          outline: "none",
          transition: "border-color 150ms ease, box-shadow 150ms ease",
          width: "100%",
        }}
        onFocus={(e) => {
          if (!error) {
            e.target.style.borderColor = "var(--brand)";
            e.target.style.boxShadow = "0 0 0 3px var(--brand-tint)";
          }
        }}
        onBlur={(e) => {
          if (!error) {
            e.target.style.borderColor = "var(--border)";
            e.target.style.boxShadow = "none";
          }
        }}
        {...props}
      />
      {error && <span style={{ fontSize: "12px", color: "var(--v-wa)", fontFamily: "var(--font-mono)" }}>{error}</span>}
      {hint && !error && <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{hint}</span>}
    </div>
  );
});

// ─── Button ───────────────────────────────────────────────────────
export function Button({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  fullWidth = false,
  disabled,
  style: extraStyle = {},
  ...props
}) {
  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    borderRadius: "var(--radius-sm)",
    fontWeight: 600,
    fontFamily: "var(--font-mono)",
    letterSpacing: "0.01em",
    cursor: disabled || isLoading ? "not-allowed" : "pointer",
    transition: "all 150ms ease",
    border: "1px solid transparent",
    outline: "none",
    width: fullWidth ? "100%" : undefined,
    opacity: disabled || isLoading ? 0.55 : 1,
    ...(size === "sm" && { padding: "6px 14px", fontSize: "13px" }),
    ...(size === "md" && { padding: "10px 20px", fontSize: "14px" }),
    ...(size === "lg" && { padding: "13px 28px", fontSize: "15px" }),
    ...(variant === "primary" && {
      background: "var(--brand)",
      color: "var(--brand-ink)",
      boxShadow: "var(--shadow-sm)",
    }),
    ...(variant === "outline" && {
      background: "transparent",
      color: "var(--text-primary)",
      borderColor: "var(--border-strong)",
    }),
    ...(variant === "ghost" && {
      background: "transparent",
      color: "var(--text-secondary)",
    }),
    ...(variant === "danger" && {
      background: "var(--v-wa)",
      color: "#1A0605",
    }),
    ...extraStyle,
  };

  return (
    <button
      disabled={disabled || isLoading}
      style={base}
      onMouseEnter={(e) => {
        if (disabled || isLoading) return;
        if (variant === "primary") e.currentTarget.style.background = "#F3C579";
        if (variant === "outline") e.currentTarget.style.borderColor = "var(--brand)";
        if (variant === "ghost") e.currentTarget.style.color = "var(--text-primary)";
      }}
      onMouseLeave={(e) => {
        if (disabled || isLoading) return;
        if (variant === "primary") e.currentTarget.style.background = "var(--brand)";
        if (variant === "outline") e.currentTarget.style.borderColor = "var(--border-strong)";
        if (variant === "ghost") e.currentTarget.style.color = "var(--text-secondary)";
      }}
      {...props}
    >
      {isLoading ? (<><Spinner size={16} />{children}</>) : children}
    </button>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────
export function Spinner({ size = 20, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round"
      style={{ animation: "spin 0.7s linear infinite", flexShrink: 0 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

// ─── Alert ────────────────────────────────────────────────────────
export function Alert({ type = "error", children }) {
  const styles = {
    error:   { bg: "rgba(240,96,90,0.1)",  border: "rgba(240,96,90,0.3)",  color: "var(--v-wa)", icon: "✕" },
    success: { bg: "rgba(63,185,80,0.1)",  border: "rgba(63,185,80,0.3)",  color: "var(--v-ac)", icon: "✓" },
    info:    { bg: "var(--brand-tint)",    border: "rgba(232,169,74,0.3)", color: "var(--brand)", icon: "ℹ" },
  };
  const s = styles[type];
  return (
    <div role="alert" style={{
      background: s.bg, border: `1px solid ${s.border}`, borderRadius: "var(--radius-sm)",
      padding: "10px 14px", fontSize: "13px", color: s.color,
      display: "flex", gap: "10px", alignItems: "flex-start",
    }}>
      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>{s.icon}</span>
      <span style={{ color: "var(--text-secondary)" }}>{children}</span>
    </div>
  );
}

// ─── Divider ──────────────────────────────────────────────────────
export function Divider({ label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", color: "var(--text-muted)", fontSize: "11px", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
      <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
      {label}
      <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
    </div>
  );
}

// ─── VerdictStamp — the signature element ─────────────────────────
const VERDICT_COLOR_VAR = {
  AC: "var(--v-ac)", WA: "var(--v-wa)", RE: "var(--v-re)",
  TLE: "var(--v-tle)", MLE: "var(--v-mle)", CE: "var(--v-ce)",
  SE: "var(--v-se)", pending: "var(--v-pending)", running: "var(--v-running)",
};
const VERDICT_LABEL = {
  AC: "Accepted", WA: "Wrong Answer", RE: "Runtime Error",
  TLE: "Time Limit", MLE: "Memory Limit", CE: "Compile Error",
  SE: "System Error", pending: "Pending", running: "Judging",
};

export function VerdictStamp({ verdict, animate = true, size = "md" }) {
  const color = VERDICT_COLOR_VAR[verdict] || "var(--v-se)";
  const label = VERDICT_LABEL[verdict] || verdict;
  return (
    <span
      className={`verdict-stamp${animate ? " stamp-animate" : ""}`}
      style={{
        color,
        fontSize: size === "sm" ? "0.8rem" : size === "lg" ? "1.4rem" : "1.1rem",
        padding: size === "sm" ? "6px 12px" : size === "lg" ? "14px 26px" : "10px 20px",
      }}
    >
      {label}
    </span>
  );
}
