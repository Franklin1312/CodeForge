import { useState, useEffect } from "react";
import api from "../../api/client.js";

/**
 * Fetches judge health and shows a non-intrusive banner when
 * Docker is unavailable and the mock judge is active.
 * Shown only on the Solve page.
 */
export default function MockModeBanner() {
  const [mode, setMode]       = useState(null); // null | "docker" | "mock" | "mock-fallback"
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    api.get("/health/judge")
      .then((res) => setMode(res.data.mode))
      .catch(() => {}); // silent — don't distract users on error
  }, []);

  if (!mode || mode === "docker" || dismissed) return null;

  return (
    <div style={{
      background: "rgba(255,109,0,0.1)",
      border: "1px solid rgba(255,109,0,0.3)",
      borderRadius: "8px",
      padding: "8px 14px",
      marginBottom: "12px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "12px",
      fontSize: "13px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span>⚠️</span>
        <span style={{ color: "var(--color-orange)" }}>
          <strong>Mock judge active</strong>
          {" — "}
          <span style={{ color: "var(--text-secondary)" }}>
            Docker is unavailable in this environment. Verdicts are simulated.
            Run <code style={{ fontFamily: "var(--font-mono)", background: "var(--surface-2)", padding: "1px 5px", borderRadius: "4px" }}>
              bash scripts/pull-judge-images.sh
            </code> on a machine with Docker to enable real execution.
          </span>
        </span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "16px", flexShrink: 0 }}
        aria-label="Dismiss"
      >×</button>
    </div>
  );
}
