import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/client.js";
import { Spinner } from "../../components/ui/index.jsx";

const STATUS_META = {
  ready:   { color: "var(--color-green)",  icon: "✅", label: "Ready" },
  pending: { color: "var(--color-orange)", icon: "⏳", label: "Pulling…" },
  failed:  { color: "var(--color-red)",    icon: "❌", label: "Failed" },
};

const MODE_META = {
  docker:        { color: "var(--color-green)",  icon: "🐳", label: "Docker sandbox (production)" },
  mock:          { color: "var(--color-orange)", icon: "🔧", label: "Mock judge (JUDGE_MOCK=true)" },
  "mock-fallback": { color: "var(--color-orange)", icon: "⚠️",  label: "Mock judge (Docker unavailable)" },
};

export default function JudgeStatusPage() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  function load() {
    setLoading(true);
    api.get("/health/judge")
      .then((res) => { setData(res.data); setError(null); })
      .catch((err) => setError(err.response?.data?.error?.message || "Failed to fetch judge status"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);
  // Auto-refresh every 10s while images are pulling
  useEffect(() => {
    if (!data) return;
    const hasPending = Object.values(data.images || {}).some((s) => s === "pending");
    if (!hasPending) return;
    const t = setInterval(load, 10_000);
    return () => clearInterval(t);
  }, [data]);

  const modeMeta = data ? (MODE_META[data.mode] || MODE_META.mock) : null;

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "32px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)" }}>Judge Status</h1>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>
            Docker image availability and execution mode
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={load} style={{ background: "var(--surface-2)", border: "1px solid var(--surface-border)", borderRadius: "8px", padding: "7px 14px", fontSize: "13px", color: "var(--text-secondary)", cursor: "pointer" }}>
            ↻ Refresh
          </button>
          <Link to="/admin" style={{ textDecoration: "none" }}>
            <button style={{ background: "transparent", border: "1px solid var(--surface-border)", borderRadius: "8px", padding: "7px 14px", fontSize: "13px", color: "var(--text-muted)", cursor: "pointer" }}>
              ← Admin
            </button>
          </Link>
        </div>
      </div>

      {loading && !data && (
        <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
          <Spinner size={28} color="var(--color-brand)" />
        </div>
      )}

      {error && (
        <div style={{ background: "rgba(255,23,68,0.08)", border: "1px solid rgba(255,23,68,0.2)", borderRadius: "10px", padding: "16px", color: "var(--color-red)", fontSize: "14px" }}>
          {error}
        </div>
      )}

      {data && (
        <>
          {/* Mode card */}
          <div style={{ background: "var(--surface-1)", border: "1px solid var(--surface-border)", borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
            <div style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "10px" }}>
              Execution Mode
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "24px" }}>{modeMeta.icon}</span>
              <div>
                <div style={{ fontSize: "16px", fontWeight: 600, color: modeMeta.color }}>{modeMeta.label}</div>
                <div style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "2px" }}>
                  Docker daemon: {data.dockerAvailable
                    ? <span style={{ color: "var(--color-green)" }}>available</span>
                    : <span style={{ color: "var(--color-red)" }}>not available</span>}
                </div>
              </div>
            </div>
            {data.mode !== "docker" && (
              <div style={{ marginTop: "14px", padding: "10px 14px", background: "rgba(255,109,0,0.08)", borderRadius: "8px", fontSize: "13px", color: "var(--text-secondary)" }}>
                To enable real code execution, start Docker and run:
                <pre style={{ margin: "6px 0 0", fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--color-brand)" }}>
                  bash scripts/pull-judge-images.sh
                </pre>
              </div>
            )}
          </div>

          {/* Image status */}
          <div style={{ background: "var(--surface-1)", border: "1px solid var(--surface-border)", borderRadius: "12px", overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--surface-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>Docker Images</div>
              {data.allImagesReady
                ? <span style={{ fontSize: "12px", color: "var(--color-green)", fontWeight: 600 }}>All ready</span>
                : <span style={{ fontSize: "12px", color: "var(--color-orange)", fontWeight: 600 }}>Pulling…</span>}
            </div>

            {Object.entries(data.images || {}).map(([image, status], i, arr) => {
              const meta = STATUS_META[status] || STATUS_META.failed;
              return (
                <div key={image} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "13px 20px",
                  borderBottom: i < arr.length - 1 ? "1px solid var(--surface-border)" : "none",
                }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--text-secondary)" }}>
                    {image}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    {status === "pending" && <Spinner size={14} color="var(--color-orange)" />}
                    <span style={{ fontSize: "12px", fontWeight: 600, color: meta.color }}>
                      {meta.icon} {meta.label}
                    </span>
                  </div>
                </div>
              );
            })}

            {Object.keys(data.images || {}).length === 0 && (
              <div style={{ padding: "24px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
                No image status available — Docker may not be running.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
