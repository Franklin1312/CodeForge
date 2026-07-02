import { forwardRef } from "react";
import { clsx } from "clsx";

// ─── Input ────────────────────────────────────────────────────────
export const Input = forwardRef(function Input(
  { label, error, hint, className, id, required, ...props },
  ref
) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{
            fontSize: "13px",
            fontWeight: 500,
            color: "var(--text-secondary)",
          }}
        >
          {label}
          {required && (
            <span style={{ color: "var(--color-red)", marginLeft: "3px" }}>*</span>
          )}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        required={required}
        style={{
          background: "var(--surface-2)",
          border: `1px solid ${error ? "var(--color-red)" : "var(--surface-border)"}`,
          borderRadius: "8px",
          padding: "10px 14px",
          fontSize: "14px",
          color: "var(--text-primary)",
          outline: "none",
          transition: "border-color 150ms ease",
          width: "100%",
        }}
        onFocus={(e) => {
          if (!error) e.target.style.borderColor = "var(--color-brand)";
        }}
        onBlur={(e) => {
          if (!error) e.target.style.borderColor = "var(--surface-border)";
        }}
        {...props}
      />
      {error && (
        <span style={{ fontSize: "12px", color: "var(--color-red)" }}>{error}</span>
      )}
      {hint && !error && (
        <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{hint}</span>
      )}
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
    borderRadius: "8px",
    fontWeight: 600,
    cursor: disabled || isLoading ? "not-allowed" : "pointer",
    transition: "all 150ms ease",
    border: "none",
    outline: "none",
    width: fullWidth ? "100%" : undefined,
    opacity: disabled || isLoading ? 0.6 : 1,
    ...(size === "sm" && { padding: "6px 12px", fontSize: "13px" }),
    ...(size === "md" && { padding: "10px 20px", fontSize: "14px" }),
    ...(size === "lg" && { padding: "13px 28px", fontSize: "16px" }),
    ...(variant === "primary" && {
      background: "var(--color-brand)",
      color: "#0f1117",
    }),
    ...(variant === "outline" && {
      background: "transparent",
      color: "var(--text-primary)",
      border: "1px solid var(--surface-border)",
    }),
    ...(variant === "ghost" && {
      background: "transparent",
      color: "var(--text-secondary)",
    }),
    ...(variant === "danger" && {
      background: "var(--color-red)",
      color: "#fff",
    }),
    ...extraStyle,
  };

  return (
    <button disabled={disabled || isLoading} style={base} {...props}>
      {isLoading ? (
        <>
          <Spinner size={16} />
          {children}
        </>
      ) : (
        children
      )}
    </button>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────
export function Spinner({ size = 20, color = "currentColor" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      style={{ animation: "spin 0.7s linear infinite", flexShrink: 0 }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

// ─── Alert ────────────────────────────────────────────────────────
export function Alert({ type = "error", children }) {
  const styles = {
    error: {
      bg: "rgba(255,23,68,0.1)",
      border: "rgba(255,23,68,0.3)",
      color: "#ff6b6b",
      icon: "⚠️",
    },
    success: {
      bg: "rgba(0,230,118,0.1)",
      border: "rgba(0,230,118,0.3)",
      color: "#00e676",
      icon: "✅",
    },
    info: {
      bg: "rgba(0,212,255,0.1)",
      border: "rgba(0,212,255,0.3)",
      color: "var(--color-brand)",
      icon: "ℹ️",
    },
  };
  const s = styles[type];
  return (
    <div
      role="alert"
      style={{
        background: s.bg,
        border: `1px solid ${s.border}`,
        borderRadius: "8px",
        padding: "10px 14px",
        fontSize: "13px",
        color: s.color,
        display: "flex",
        gap: "8px",
        alignItems: "flex-start",
      }}
    >
      <span>{s.icon}</span>
      <span>{children}</span>
    </div>
  );
}

// ─── Divider ──────────────────────────────────────────────────────
export function Divider({ label }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        color: "var(--text-muted)",
        fontSize: "12px",
      }}
    >
      <div style={{ flex: 1, height: "1px", background: "var(--surface-border)" }} />
      {label}
      <div style={{ flex: 1, height: "1px", background: "var(--surface-border)" }} />
    </div>
  );
}
