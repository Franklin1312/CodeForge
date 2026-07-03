const LANG_META = {
  python:     { label: "Python 3.12",     icon: "🐍" },
  javascript: { label: "JavaScript (Node 20)", icon: "🟨" },
  java:       { label: "Java 21",         icon: "☕" },
  cpp:        { label: "C++ (GCC 13)",    icon: "⚙️" },
  go:         { label: "Go 1.22",         icon: "🐹" },
  rust:       { label: "Rust 1.78",       icon: "🦀" },
};

export default function LanguageSelector({ languages, selected, onChange }) {
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <select
        value={selected}
        onChange={(e) => onChange(e.target.value)}
        style={{
          appearance: "none",
          background: "var(--surface-2)",
          border: "1px solid var(--surface-border)",
          borderRadius: "8px",
          padding: "7px 32px 7px 12px",
          fontSize: "13px",
          color: "var(--text-primary)",
          cursor: "pointer",
          outline: "none",
          fontFamily: "var(--font-mono)",
        }}
      >
        {languages.map((lang) => {
          const m = LANG_META[lang] || { label: lang, icon: "💻" };
          return (
            <option key={lang} value={lang}>
              {m.icon}  {m.label}
            </option>
          );
        })}
      </select>
      {/* Dropdown arrow */}
      <span style={{
        position: "absolute", right: "10px", top: "50%",
        transform: "translateY(-50%)",
        color: "var(--text-muted)", pointerEvents: "none", fontSize: "10px",
      }}>▼</span>
    </div>
  );
}
