import { useEffect, useState, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchProblems,
  setFilters,
  clearFilters,
  selectProblems,
  selectPagination,
  selectFilters,
  selectListStatus,
  selectListError,
} from "../../store/slices/problemsSlice.js";
import { problemsApi } from "../../api/problems.js";
import { Spinner, Button } from "../../components/ui/index.jsx";
import { useQuery } from "react-query";

const DIFFICULTY_COLORS = {
  easy:   { bg: "rgba(0,230,118,0.12)",  text: "#00e676" },
  medium: { bg: "rgba(255,109,0,0.12)",  text: "#ff6d00" },
  hard:   { bg: "rgba(255,23,68,0.12)",  text: "#ff1744" },
};

function DifficultyBadge({ difficulty }) {
  const c = DIFFICULTY_COLORS[difficulty] || {};
  return (
    <span style={{
      background: c.bg, color: c.text,
      padding: "2px 10px", borderRadius: "99px",
      fontSize: "12px", fontWeight: 600, textTransform: "capitalize",
    }}>
      {difficulty}
    </span>
  );
}

function TagBadge({ tag, active, onClick }) {
  return (
    <button
      onClick={() => onClick(tag)}
      style={{
        padding: "3px 10px", borderRadius: "99px", fontSize: "12px",
        cursor: "pointer", border: "1px solid",
        borderColor: active ? "var(--color-brand)" : "var(--surface-border)",
        background: active ? "rgba(0,212,255,0.12)" : "transparent",
        color: active ? "var(--color-brand)" : "var(--text-muted)",
        transition: "all 150ms",
      }}
    >
      {tag}
    </button>
  );
}

export default function ProblemsPage() {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();

  const problems   = useSelector(selectProblems);
  const pagination = useSelector(selectPagination);
  const filters    = useSelector(selectFilters);
  const status     = useSelector(selectListStatus);
  const error      = useSelector(selectListError);

  const [searchInput, setSearchInput] = useState(filters.search || "");

  // Fetch tags for filter sidebar
  const { data: tagsData } = useQuery("problem-tags", problemsApi.getTags, {
    staleTime: 1000 * 60 * 10,
  });

  // Sync URL params → Redux filters on mount
  useEffect(() => {
    const d = searchParams.get("difficulty") || "";
    const s = searchParams.get("search") || "";
    const t = searchParams.get("tags")?.split(",").filter(Boolean) || [];
    dispatch(setFilters({ difficulty: d, search: s, tags: t }));
  }, []); // eslint-disable-line

  // Fetch whenever filters change
  useEffect(() => {
    const params = {
      difficulty: filters.difficulty || undefined,
      search: filters.search || undefined,
      tags: filters.tags?.join(",") || undefined,
      page: parseInt(searchParams.get("page")) || 1,
    };
    dispatch(fetchProblems(params));
  }, [filters, dispatch]); // eslint-disable-line

  function handleDifficultyChange(d) {
    const newDiff = filters.difficulty === d ? "" : d;
    dispatch(setFilters({ difficulty: newDiff }));
    updateURL({ difficulty: newDiff });
  }

  function handleTagToggle(tag) {
    const current = filters.tags || [];
    const newTags = current.includes(tag)
      ? current.filter((t) => t !== tag)
      : [...current, tag];
    dispatch(setFilters({ tags: newTags }));
    updateURL({ tags: newTags.join(",") });
  }

  function handleSearch(e) {
    e.preventDefault();
    dispatch(setFilters({ search: searchInput }));
    updateURL({ search: searchInput });
  }

  function handleClearFilters() {
    setSearchInput("");
    dispatch(clearFilters());
    setSearchParams({});
  }

  function handlePage(p) {
    setSearchParams((prev) => { prev.set("page", p); return prev; });
    dispatch(fetchProblems({ ...filters, page: p }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateURL(updates) {
    setSearchParams((prev) => {
      Object.entries(updates).forEach(([k, v]) => {
        if (v) prev.set(k, v); else prev.delete(k);
      });
      prev.delete("page");
      return prev;
    });
  }

  const activeFilters =
    filters.difficulty || filters.search || (filters.tags?.length > 0);

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 24px", display: "flex", gap: "28px" }}>

      {/* ─── Sidebar ──────────────────────────────────────── */}
      <aside style={{ width: "220px", flexShrink: 0 }}>
        <div style={{ position: "sticky", top: "76px" }}>
          <h3 style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>
            Difficulty
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "28px" }}>
            {["easy", "medium", "hard"].map((d) => (
              <button
                key={d}
                onClick={() => handleDifficultyChange(d)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "8px 12px", borderRadius: "8px", border: "none", cursor: "pointer",
                  background: filters.difficulty === d ? "var(--surface-2)" : "transparent",
                  textAlign: "left", transition: "background 120ms",
                }}
                onMouseEnter={(e) => { if (filters.difficulty !== d) e.currentTarget.style.background = "var(--surface-1)"; }}
                onMouseLeave={(e) => { if (filters.difficulty !== d) e.currentTarget.style.background = "transparent"; }}
              >
                <DifficultyBadge difficulty={d} />
                {filters.difficulty === d && <span style={{ fontSize: "10px", color: "var(--color-brand)" }}>✓</span>}
              </button>
            ))}
          </div>

          {tagsData?.tags?.length > 0 && (
            <>
              <h3 style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>
                Topics
              </h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {tagsData.tags.map((tag) => (
                  <TagBadge
                    key={tag}
                    tag={tag}
                    active={filters.tags?.includes(tag)}
                    onClick={handleTagToggle}
                  />
                ))}
              </div>
            </>
          )}

          {activeFilters && (
            <button
              onClick={handleClearFilters}
              style={{
                marginTop: "20px", width: "100%", padding: "8px",
                background: "transparent", border: "1px solid var(--surface-border)",
                borderRadius: "8px", color: "var(--text-muted)", fontSize: "13px",
                cursor: "pointer",
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      </aside>

      {/* ─── Main content ─────────────────────────────────── */}
      <main style={{ flex: 1, minWidth: 0 }}>
        {/* Header + search */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", gap: "16px", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)" }}>Problems</h1>
            {pagination && (
              <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "2px" }}>
                {pagination.total} problem{pagination.total !== 1 ? "s" : ""}
              </p>
            )}
          </div>
          <form onSubmit={handleSearch} style={{ display: "flex", gap: "8px" }}>
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search problems…"
              style={{
                background: "var(--surface-2)", border: "1px solid var(--surface-border)",
                borderRadius: "8px", padding: "8px 14px", fontSize: "14px",
                color: "var(--text-primary)", outline: "none", width: "220px",
              }}
            />
            <Button type="submit" size="sm">Search</Button>
          </form>
        </div>

        {/* Table */}
        {status === "loading" ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
            <Spinner size={36} color="var(--color-brand)" />
          </div>
        ) : error ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "var(--color-red)" }}>
            {error}
          </div>
        ) : problems.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text-muted)" }}>
            <div style={{ fontSize: "40px", marginBottom: "16px" }}>🔍</div>
            <p>No problems match your filters.</p>
            {activeFilters && (
              <button onClick={handleClearFilters} style={{ marginTop: "12px", color: "var(--color-brand)", background: "none", border: "none", cursor: "pointer", fontSize: "14px" }}>
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div style={{ border: "1px solid var(--surface-border)", borderRadius: "12px", overflow: "hidden" }}>
              {/* Table header */}
              <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 100px 100px 80px", gap: "0", background: "var(--surface-1)", padding: "10px 16px", borderBottom: "1px solid var(--surface-border)" }}>
                {["#", "Title", "Difficulty", "Tags", "Acceptance"].map((h) => (
                  <span key={h} style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</span>
                ))}
              </div>

              {/* Rows */}
              {problems.map((p, i) => (
                <div
                  key={p._id}
                  style={{
                    display: "grid", gridTemplateColumns: "40px 1fr 100px 100px 80px",
                    gap: "0", padding: "14px 16px", alignItems: "center",
                    borderBottom: i < problems.length - 1 ? "1px solid var(--surface-border)" : "none",
                    transition: "background 120ms",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-1)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>{i + 1}</span>
                  <Link
                    to={`/problems/${p.slug}`}
                    style={{ fontSize: "14px", fontWeight: 500, color: "var(--text-primary)", textDecoration: "none" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-brand)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
                  >
                    {p.title}
                  </Link>
                  <DifficultyBadge difficulty={p.difficulty} />
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                    {p.tags?.slice(0, 2).map((t) => (
                      <span key={t} style={{ fontSize: "11px", color: "var(--text-muted)", background: "var(--surface-2)", padding: "1px 6px", borderRadius: "4px" }}>{t}</span>
                    ))}
                  </div>
                  <span style={{ fontSize: "13px", color: p.stats?.acceptanceRate >= 50 ? "var(--color-green)" : "var(--text-muted)" }}>
                    {p.stats?.acceptanceRate?.toFixed(1) ?? "—"}%
                  </span>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "28px" }}>
                <Button variant="outline" size="sm" disabled={!pagination.hasPrev} onClick={() => handlePage(pagination.page - 1)}>← Prev</Button>
                <span style={{ display: "flex", alignItems: "center", fontSize: "13px", color: "var(--text-muted)", padding: "0 8px" }}>
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button variant="outline" size="sm" disabled={!pagination.hasNext} onClick={() => handlePage(pagination.page + 1)}>Next →</Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
