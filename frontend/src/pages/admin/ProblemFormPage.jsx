import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import {
  createProblem,
  updateProblem,
  selectMutationStatus,
  selectMutationError,
  clearMutationError,
} from "../../store/slices/problemsSlice.js";
import { problemsApi } from "../../api/problems.js";
import { Input, Button, Alert, Spinner } from "../../components/ui/index.jsx";
import toast from "react-hot-toast";

const LANGUAGES = ["python", "javascript", "java", "cpp", "go", "rust"];
const DIFFICULTIES = ["easy", "medium", "hard"];

const DEFAULT_STARTER = {
  python: "def solution():\n    pass\n",
  javascript: "function solution() {\n    \n}\n",
  java: "class Solution {\n    public void solution() {\n        \n    }\n}\n",
  cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\nvoid solution() {\n    \n}\n",
  go: "package main\n\nfunc solution() {\n    \n}\n",
  rust: "fn solution() {\n    \n}\n",
};

function TestCaseEditor({ testCases, onChange }) {
  function addCase() {
    onChange([...testCases, { input: "", expectedOutput: "", isHidden: false, explanation: "" }]);
  }
  function removeCase(i) {
    onChange(testCases.filter((_, idx) => idx !== i));
  }
  function updateCase(i, field, value) {
    const updated = testCases.map((tc, idx) => idx === i ? { ...tc, [field]: value } : tc);
    onChange(updated);
  }

  return (
    <div>
      {testCases.map((tc, i) => (
        <div key={i} style={{ background: "var(--surface-2)", border: "1px solid var(--surface-border)", borderRadius: "10px", padding: "16px", marginBottom: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-muted)" }}>
              Test Case {i + 1} {tc.isHidden && <span style={{ color: "var(--color-orange)", marginLeft: "6px" }}>🔒 Hidden</span>}
            </span>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--text-muted)", cursor: "pointer" }}>
                <input type="checkbox" checked={tc.isHidden} onChange={(e) => updateCase(i, "isHidden", e.target.checked)} />
                Hidden
              </label>
              <button onClick={() => removeCase(i)} style={{ background: "rgba(255,23,68,0.1)", border: "none", borderRadius: "6px", color: "var(--color-red)", fontSize: "12px", padding: "4px 10px", cursor: "pointer" }}>
                Remove
              </button>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "12px", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>Input</label>
              <textarea
                value={tc.input}
                onChange={(e) => updateCase(i, "input", e.target.value)}
                rows={3}
                style={textareaStyle}
                placeholder="stdin input..."
              />
            </div>
            <div>
              <label style={{ fontSize: "12px", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>Expected Output</label>
              <textarea
                value={tc.expectedOutput}
                onChange={(e) => updateCase(i, "expectedOutput", e.target.value)}
                rows={3}
                style={textareaStyle}
                placeholder="expected stdout..."
              />
            </div>
          </div>
          <div style={{ marginTop: "10px" }}>
            <label style={{ fontSize: "12px", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>Explanation (optional)</label>
            <input
              value={tc.explanation || ""}
              onChange={(e) => updateCase(i, "explanation", e.target.value)}
              style={{ ...inputStyle, width: "100%" }}
              placeholder="Brief explanation of this test case..."
            />
          </div>
        </div>
      ))}
      <button onClick={addCase} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px dashed var(--surface-border)", background: "transparent", color: "var(--text-muted)", fontSize: "13px", cursor: "pointer", transition: "all 150ms" }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--color-brand)"; e.currentTarget.style.color = "var(--color-brand)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--surface-border)"; e.currentTarget.style.color = "var(--text-muted)"; }}>
        + Add Test Case
      </button>
    </div>
  );
}

function ExamplesEditor({ examples, onChange }) {
  function add() {
    onChange([...examples, { input: "", output: "", explanation: "" }]);
  }
  function remove(i) { onChange(examples.filter((_, idx) => idx !== i)); }
  function update(i, field, value) {
    onChange(examples.map((ex, idx) => idx === i ? { ...ex, [field]: value } : ex));
  }
  return (
    <div>
      {examples.map((ex, i) => (
        <div key={i} style={{ background: "var(--surface-2)", border: "1px solid var(--surface-border)", borderRadius: "10px", padding: "16px", marginBottom: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-muted)" }}>Example {i + 1}</span>
            <button onClick={() => remove(i)} style={{ background: "rgba(255,23,68,0.1)", border: "none", borderRadius: "6px", color: "var(--color-red)", fontSize: "12px", padding: "4px 10px", cursor: "pointer" }}>Remove</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "10px" }}>
            <div>
              <label style={labelStyle}>Input</label>
              <textarea value={ex.input} onChange={(e) => update(i, "input", e.target.value)} rows={2} style={textareaStyle} />
            </div>
            <div>
              <label style={labelStyle}>Output</label>
              <textarea value={ex.output} onChange={(e) => update(i, "output", e.target.value)} rows={2} style={textareaStyle} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Explanation</label>
            <input value={ex.explanation || ""} onChange={(e) => update(i, "explanation", e.target.value)} style={{ ...inputStyle, width: "100%" }} placeholder="Optional explanation..." />
          </div>
        </div>
      ))}
      <button onClick={add} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px dashed var(--surface-border)", background: "transparent", color: "var(--text-muted)", fontSize: "13px", cursor: "pointer" }}>
        + Add Example
      </button>
    </div>
  );
}

export default function ProblemFormPage() {
  const { id } = useParams(); // undefined = create mode
  const isEditMode = Boolean(id);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const mutationStatus = useSelector(selectMutationStatus);
  const mutationError  = useSelector(selectMutationError);

  const [loading, setLoading] = useState(isEditMode);
  const [activeTab, setActiveTab] = useState("basic"); // basic | examples | testcases | starter | editorial

  const [form, setForm] = useState({
    title: "", slug: "", difficulty: "easy", description: "", constraints: "",
    tags: "", timeLimit: 2000, memoryLimit: 256,
    allowedLanguages: [...LANGUAGES],
    isPublished: false, isPremium: false,
    examples: [],
    testCases: [],
    starterCode: { ...DEFAULT_STARTER },
    editorial: { content: "", approach: "", complexity: { time: "", space: "" }, isPremium: false },
  });

  const [errors, setErrors] = useState({});

  // Load existing problem in edit mode
  useEffect(() => {
    if (!isEditMode) return;
    setLoading(true);
    problemsApi.getAdminById(id)
      .then(({ problem }) => {
        setForm({
          title: problem.title || "",
          slug: problem.slug || "",
          difficulty: problem.difficulty || "easy",
          description: problem.description || "",
          constraints: problem.constraints || "",
          tags: (problem.tags || []).join(", "),
          timeLimit: problem.timeLimit || 2000,
          memoryLimit: problem.memoryLimit || 256,
          allowedLanguages: problem.allowedLanguages || [...LANGUAGES],
          isPublished: problem.isPublished || false,
          isPremium: problem.isPremium || false,
          examples: problem.examples || [],
          testCases: problem.testCases || [],
          starterCode: Object.fromEntries(problem.starterCode || []) || { ...DEFAULT_STARTER },
          editorial: problem.editorial || { content: "", approach: "", complexity: { time: "", space: "" }, isPremium: false },
        });
      })
      .catch(() => toast.error("Failed to load problem"))
      .finally(() => setLoading(false));
  }, [id, isEditMode]);

  useEffect(() => {
    return () => dispatch(clearMutationError());
  }, [dispatch]);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: "" }));
  }

  function validate() {
    const errs = {};
    if (!form.title.trim()) errs.title = "Title is required";
    if (!form.description.trim()) errs.description = "Description is required";
    if (!form.difficulty) errs.difficulty = "Difficulty is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) { setActiveTab("basic"); return; }

    const payload = {
      ...form,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      starterCode: form.starterCode,
    };

    const action = isEditMode
      ? dispatch(updateProblem({ id, data: payload }))
      : dispatch(createProblem(payload));

    const result = await action;
    if (result.meta.requestStatus === "fulfilled") {
      toast.success(`Problem ${isEditMode ? "updated" : "created"} successfully`);
      navigate("/admin/problems");
    }
  }

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
        <Spinner size={36} color="var(--color-brand)" />
      </div>
    );
  }

  const tabs = [
    { key: "basic",      label: "Basic Info" },
    { key: "examples",   label: "Examples" },
    { key: "testcases",  label: "Test Cases" },
    { key: "starter",    label: "Starter Code" },
    { key: "editorial",  label: "Editorial" },
  ];

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "32px 24px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)" }}>
            {isEditMode ? "Edit Problem" : "Create Problem"}
          </h1>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>
            {isEditMode ? `Editing: ${form.title || id}` : "Add a new problem to the judge"}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate("/admin/problems")}>← Back</Button>
      </div>

      {mutationError && (
        <div style={{ marginBottom: "20px" }}>
          <Alert type="error">{mutationError}</Alert>
        </div>
      )}

      {/* Tab bar */}
      <div style={{ display: "flex", gap: "2px", background: "var(--surface-1)", border: "1px solid var(--surface-border)", borderRadius: "10px", padding: "4px", marginBottom: "24px" }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              flex: 1, padding: "8px 12px", borderRadius: "7px", border: "none",
              fontSize: "13px", fontWeight: 500, cursor: "pointer", transition: "all 150ms",
              background: activeTab === t.key ? "var(--surface-3)" : "transparent",
              color: activeTab === t.key ? "var(--text-primary)" : "var(--text-muted)",
            }}
          >
            {t.label}
            {t.key === "testcases" && form.testCases.length > 0 && (
              <span style={{ marginLeft: "6px", fontSize: "11px", background: "var(--color-brand)", color: "#0f1117", padding: "1px 6px", borderRadius: "99px" }}>
                {form.testCases.length}
              </span>
            )}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        {/* ─── Basic Info ─────────────────────────────────────── */}
        {activeTab === "basic" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <Input label="Title" value={form.title} onChange={(e) => set("title", e.target.value)} error={errors.title} placeholder="Two Sum" required />
            <Input label="Slug (auto-generated if empty)" value={form.slug} onChange={(e) => set("slug", e.target.value)} placeholder="two-sum" hint="Lowercase letters, numbers, hyphens only" />

            <div>
              <label style={labelStyle}>Difficulty *</label>
              <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d} type="button" onClick={() => set("difficulty", d)}
                    style={{
                      flex: 1, padding: "10px", borderRadius: "8px", border: "2px solid",
                      borderColor: form.difficulty === d ? diffColor(d) : "var(--surface-border)",
                      background: form.difficulty === d ? `${diffColor(d)}18` : "transparent",
                      color: form.difficulty === d ? diffColor(d) : "var(--text-muted)",
                      fontSize: "14px", fontWeight: 600, cursor: "pointer", textTransform: "capitalize",
                    }}
                  >{d}</button>
                ))}
              </div>
              {errors.difficulty && <span style={{ fontSize: "12px", color: "var(--color-red)" }}>{errors.difficulty}</span>}
            </div>

            <div>
              <label style={labelStyle}>Description (Markdown) *</label>
              <textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={10}
                style={{ ...textareaStyle, marginTop: "6px", width: "100%", fontSize: "14px" }}
                placeholder="Given an array of integers `nums`..."
              />
              {errors.description && <span style={{ fontSize: "12px", color: "var(--color-red)" }}>{errors.description}</span>}
            </div>

            <div>
              <label style={labelStyle}>Constraints (Markdown)</label>
              <textarea value={form.constraints} onChange={(e) => set("constraints", e.target.value)} rows={4} style={{ ...textareaStyle, marginTop: "6px", width: "100%" }} placeholder="- 2 ≤ nums.length ≤ 10^4&#10;- -10^9 ≤ nums[i] ≤ 10^9" />
            </div>

            <Input label="Tags (comma-separated)" value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="array, hash-table, two-pointers" hint="Lowercase, comma-separated" />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <Input label="Time Limit (ms)" type="number" value={form.timeLimit} onChange={(e) => set("timeLimit", parseInt(e.target.value))} min={100} max={10000} />
              <Input label="Memory Limit (MB)" type="number" value={form.memoryLimit} onChange={(e) => set("memoryLimit", parseInt(e.target.value))} min={16} max={1024} />
            </div>

            <div>
              <label style={labelStyle}>Allowed Languages</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" }}>
                {LANGUAGES.map((lang) => {
                  const active = form.allowedLanguages.includes(lang);
                  return (
                    <button key={lang} type="button"
                      onClick={() => set("allowedLanguages", active ? form.allowedLanguages.filter((l) => l !== lang) : [...form.allowedLanguages, lang])}
                      style={{ padding: "6px 14px", borderRadius: "8px", border: "1px solid", fontSize: "13px", cursor: "pointer", fontWeight: 500, transition: "all 150ms", borderColor: active ? "var(--color-brand)" : "var(--surface-border)", background: active ? "rgba(0,212,255,0.1)" : "transparent", color: active ? "var(--color-brand)" : "var(--text-muted)" }}>
                      {lang}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "flex", gap: "24px" }}>
              <Toggle label="Published" checked={form.isPublished} onChange={(v) => set("isPublished", v)} />
              <Toggle label="Premium only" checked={form.isPremium} onChange={(v) => set("isPremium", v)} />
            </div>
          </div>
        )}

        {/* ─── Examples ───────────────────────────────────────── */}
        {activeTab === "examples" && (
          <ExamplesEditor examples={form.examples} onChange={(ex) => set("examples", ex)} />
        )}

        {/* ─── Test Cases ─────────────────────────────────────── */}
        {activeTab === "testcases" && (
          <TestCaseEditor testCases={form.testCases} onChange={(tc) => set("testCases", tc)} />
        )}

        {/* ─── Starter Code ───────────────────────────────────── */}
        {activeTab === "starter" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {form.allowedLanguages.map((lang) => (
              <div key={lang}>
                <label style={{ ...labelStyle, textTransform: "capitalize" }}>{lang}</label>
                <textarea
                  value={form.starterCode[lang] || ""}
                  onChange={(e) => set("starterCode", { ...form.starterCode, [lang]: e.target.value })}
                  rows={6}
                  style={{ ...textareaStyle, marginTop: "6px", width: "100%", fontFamily: "var(--font-mono)", fontSize: "13px" }}
                />
              </div>
            ))}
          </div>
        )}

        {/* ─── Editorial ──────────────────────────────────────── */}
        {activeTab === "editorial" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={labelStyle}>Approach</label>
              <textarea value={form.editorial.approach} onChange={(e) => set("editorial", { ...form.editorial, approach: e.target.value })} rows={3} style={{ ...textareaStyle, marginTop: "6px", width: "100%" }} placeholder="Describe the approach..." />
            </div>
            <div>
              <label style={labelStyle}>Full Editorial (Markdown)</label>
              <textarea value={form.editorial.content} onChange={(e) => set("editorial", { ...form.editorial, content: e.target.value })} rows={10} style={{ ...textareaStyle, marginTop: "6px", width: "100%", fontSize: "14px" }} placeholder="Detailed editorial with code..." />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <Input label="Time Complexity" value={form.editorial.complexity?.time || ""} onChange={(e) => set("editorial", { ...form.editorial, complexity: { ...form.editorial.complexity, time: e.target.value } })} placeholder="O(n)" />
              <Input label="Space Complexity" value={form.editorial.complexity?.space || ""} onChange={(e) => set("editorial", { ...form.editorial, complexity: { ...form.editorial.complexity, space: e.target.value } })} placeholder="O(1)" />
            </div>
            <Toggle label="Premium editorial" checked={form.editorial.isPremium} onChange={(v) => set("editorial", { ...form.editorial, isPremium: v })} />
          </div>
        )}

        {/* ─── Submit bar ─────────────────────────────────────── */}
        <div style={{ display: "flex", gap: "12px", marginTop: "32px", paddingTop: "20px", borderTop: "1px solid var(--surface-border)", justifyContent: "flex-end" }}>
          <Button variant="outline" type="button" onClick={() => navigate("/admin/problems")}>Cancel</Button>
          <Button type="submit" isLoading={mutationStatus === "loading"}>
            {isEditMode ? "Save Changes" : "Create Problem"}
          </Button>
        </div>
      </form>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────
function Toggle({ label, checked, onChange }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: "40px", height: "22px", borderRadius: "99px", position: "relative",
          background: checked ? "var(--color-brand)" : "var(--surface-border)",
          transition: "background 200ms", cursor: "pointer",
        }}
      >
        <div style={{
          position: "absolute", top: "3px",
          left: checked ? "21px" : "3px",
          width: "16px", height: "16px", borderRadius: "50%",
          background: "#fff", transition: "left 200ms",
        }} />
      </div>
      <span style={{ fontSize: "14px", color: "var(--text-secondary)" }}>{label}</span>
    </label>
  );
}

function diffColor(d) {
  return { easy: "#00e676", medium: "#ff6d00", hard: "#ff1744" }[d] || "var(--color-brand)";
}

const labelStyle = { fontSize: "13px", fontWeight: 500, color: "var(--text-secondary)" };
const textareaStyle = {
  background: "var(--surface-2)", border: "1px solid var(--surface-border)",
  borderRadius: "8px", padding: "10px 12px", fontSize: "13px",
  color: "var(--text-primary)", outline: "none", resize: "vertical",
  fontFamily: "var(--font-sans)", width: "100%",
};
const inputStyle = {
  background: "var(--surface-2)", border: "1px solid var(--surface-border)",
  borderRadius: "8px", padding: "8px 12px", fontSize: "13px",
  color: "var(--text-primary)", outline: "none",
};
