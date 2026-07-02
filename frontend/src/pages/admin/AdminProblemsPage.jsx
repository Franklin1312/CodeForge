import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchProblems,
  deleteProblem,
  togglePublish,
  selectProblems,
  selectPagination,
  selectListStatus,
  selectMutationStatus,
} from "../../store/slices/problemsSlice.js";
import { Button, Spinner } from "../../components/ui/index.jsx";
import toast from "react-hot-toast";

const DIFF_COLORS = {
  easy:   { bg: "rgba(0,230,118,0.12)", text: "#00e676" },
  medium: { bg: "rgba(255,109,0,0.12)", text: "#ff6d00" },
  hard:   { bg: "rgba(255,23,68,0.12)", text: "#ff1744" },
};

function ConfirmModal({ problem, onConfirm, onCancel }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
    }}>
      <div style={{ background: "var(--surface-2)", border: "1px solid var(--surface-border)", borderRadius: "14px", padding: "28px", maxWidth: "420px", width: "90%" }}>
        <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "10px" }}>Delete Problem</h3>
        <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "24px" }}>
          Are you sure you want to delete <strong style={{ color: "var(--color-red)" }}>{problem.title}</strong>?
          This action cannot be undone and will remove all associated submissions.
        </p>
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
          <Button variant="danger" size="sm" onClick={onConfirm}>Delete permanently</Button>
        </div>
      </div>
    </div>
  );
}

export default function AdminProblemsPage() {
  const dispatch    = useDispatch();
  const navigate    = useNavigate();
  const problems    = useSelector(selectProblems);
  const pagination  = useSelector(selectPagination);
  const listStatus  = useSelector(selectListStatus);
  const mutStatus   = useSelector(selectMutationStatus);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [diffFilter, setDiffFilter] = useState("");

  function load(p = page) {
    dispatch(fetchProblems({
      page: p,
      limit: 20,
      difficulty: diffFilter || undefined,
      search: search || undefined,
    }));
  }

  useEffect(() => { load(1); }, [diffFilter]); // eslint-disable-line
  useEffect(() => { load(page); }, [page]);     // eslint-disable-line

  async function handleDelete() {
    if (!deleteTarget) return;
    const result = await dispatch(deleteProblem(deleteTarget._id));
    if (result.meta.requestStatus === "fulfilled") {
      toast.success(`"${deleteTarget.title}" deleted`);
      setDeleteTarget(null);
    } else {
      toast.error("Failed to delete problem");
    }
  }

  async function handleTogglePublish(problem) {
    const result = await dispatch(togglePublish(problem._id));
    if (result.meta.requestStatus === "fulfilled") {
      const p = result.payload;
      toast.success(`"${p.title}" ${p.isPublished ? "published" : "unpublished"}`);
    } else {
      toast.error("Failed to update problem");
    }
  }

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "32px 24px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)" }}>Problems</h1>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>
            {pagination?.total ?? 0} total · manage and publish
          </p>
        </div>
        <Button onClick={() => navigate("/admin/problems/new")}>+ Create Problem</Button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
        <form onSubmit={(e) => { e.preventDefault(); setPage(1); load(1); }} style={{ display: "flex", gap: "8px" }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title..."
            style={{ background: "var(--surface-1)", border: "1px solid var(--surface-border)", borderRadius: "8px", padding: "8px 14px", fontSize: "14px", color: "var(--text-primary)", outline: "none", width: "240px" }}
          />
          <Button type="submit" size="sm" variant="outline">Search</Button>
        </form>
        <div style={{ display: "flex", gap: "6px" }}>
          {["", "easy", "medium", "hard"].map((d) => (
            <button key={d}
              onClick={() => { setDiffFilter(d); setPage(1); }}
              style={{
                padding: "7px 14px", borderRadius: "8px", border: "1px solid", fontSize: "13px", cursor: "pointer",
                borderColor: diffFilter === d ? "var(--color-brand)" : "var(--surface-border)",
                background: diffFilter === d ? "rgba(0,212,255,0.1)" : "transparent",
                color: diffFilter === d ? "var(--color-brand)" : "var(--text-muted)",
                textTransform: "capitalize", transition: "all 150ms",
              }}
            >{d || "All"}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ border: "1px solid var(--surface-border)", borderRadius: "12px", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 100px 80px 80px 160px", gap: "0", background: "var(--surface-1)", padding: "10px 16px", borderBottom: "1px solid var(--surface-border)" }}>
          {["Title", "Difficulty", "Status", "Tests", "Rate", "Actions"].map((h) => (
            <span key={h} style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</span>
          ))}
        </div>

        {listStatus === "loading" ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
            <Spinner size={28} color="var(--color-brand)" />
          </div>
        ) : problems.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)" }}>
            No problems found.{" "}
            <button onClick={() => navigate("/admin/problems/new")} style={{ color: "var(--color-brand)", background: "none", border: "none", cursor: "pointer" }}>Create one</button>
          </div>
        ) : (
          problems.map((p, i) => {
            const dc = DIFF_COLORS[p.difficulty] || {};
            return (
              <div key={p._id} style={{
                display: "grid", gridTemplateColumns: "1fr 90px 100px 80px 80px 160px",
                gap: "0", padding: "13px 16px", alignItems: "center",
                borderBottom: i < problems.length - 1 ? "1px solid var(--surface-border)" : "none",
                transition: "background 120ms",
              }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-1)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                {/* Title */}
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 500, color: "var(--text-primary)" }}>{p.title}</div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px", fontFamily: "var(--font-mono)" }}>/{p.slug}</div>
                </div>

                {/* Difficulty */}
                <span style={{ background: dc.bg, color: dc.text, padding: "2px 10px", borderRadius: "99px", fontSize: "12px", fontWeight: 600, textTransform: "capitalize", display: "inline-block" }}>
                  {p.difficulty}
                </span>

                {/* Status */}
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: "5px",
                  fontSize: "12px", fontWeight: 600,
                  color: p.isPublished ? "var(--color-green)" : "var(--text-muted)",
                }}>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: p.isPublished ? "var(--color-green)" : "var(--surface-border)", display: "inline-block" }} />
                  {p.isPublished ? "Published" : "Draft"}
                </span>

                {/* Test count */}
                <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                  {p.testCases?.length ?? "—"}
                </span>

                {/* Acceptance */}
                <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                  {p.stats?.acceptanceRate?.toFixed(1) ?? 0}%
                </span>

                {/* Actions */}
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  <button
                    onClick={() => navigate(`/admin/problems/${p._id}/edit`)}
                    style={actionBtn}
                    title="Edit"
                  >✏️ Edit</button>
                  <button
                    onClick={() => handleTogglePublish(p)}
                    disabled={mutStatus === "loading"}
                    style={{ ...actionBtn, color: p.isPublished ? "var(--color-orange)" : "var(--color-green)" }}
                    title={p.isPublished ? "Unpublish" : "Publish"}
                  >{p.isPublished ? "Unpublish" : "Publish"}</button>
                  <button
                    onClick={() => setDeleteTarget(p)}
                    style={{ ...actionBtn, color: "var(--color-red)" }}
                    title="Delete"
                  >🗑</button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "24px" }}>
          <Button variant="outline" size="sm" disabled={!pagination.hasPrev} onClick={() => setPage((p) => p - 1)}>← Prev</Button>
          <span style={{ display: "flex", alignItems: "center", fontSize: "13px", color: "var(--text-muted)", padding: "0 8px" }}>
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={!pagination.hasNext} onClick={() => setPage((p) => p + 1)}>Next →</Button>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteTarget && (
        <ConfirmModal
          problem={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

const actionBtn = {
  background: "var(--surface-2)", border: "1px solid var(--surface-border)",
  borderRadius: "6px", padding: "4px 9px", fontSize: "12px",
  cursor: "pointer", color: "var(--text-secondary)", transition: "all 120ms",
};
