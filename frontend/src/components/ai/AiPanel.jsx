import { useState, useEffect, useRef } from "react";
import { useAI } from "../../hooks/useAI.js";
import { getAiUsage } from "../../api/ai.js";
import MarkdownContent from "../ui/MarkdownContent.jsx";
import { Spinner, Button } from "../ui/index.jsx";

const FEATURES = [
  { id: "hint",          icon: "💡", label: "Hint",          desc: "Staged hint (1–3)" },
  { id: "complexity",    icon: "📊", label: "Complexity",    desc: "Big-O analysis" },
  { id: "review",        icon: "🔍", label: "Review",        desc: "Code review" },
  { id: "debug",         icon: "🐞", label: "Debug",         desc: "Find the bug" },
  { id: "explain",       icon: "📖", label: "Explain",       desc: "Explain my code" },
  { id: "optimal",       icon: "🏆", label: "Optimal",       desc: "Best solution" },
  { id: "learning-path", icon: "🗺️", label: "Learn Next",    desc: "What to study" },
  { id: "chat",          icon: "💬", label: "Chat",          desc: "Ask anything" },
];

function UsageBar({ used, limit }) {
  const pct = Math.min(100, (used / limit) * 100);
  const color = pct > 80 ? "var(--color-red)" : pct > 60 ? "var(--color-orange)" : "var(--color-brand)";
  return (
    <div style={{ marginBottom: "12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>
        <span>AI usage today</span>
        <span style={{ color }}>{used}/{limit}</span>
      </div>
      <div style={{ height: "3px", background: "var(--surface-border)", borderRadius: "99px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: "99px", transition: "width 500ms" }} />
      </div>
    </div>
  );
}

function HintLevelSelector({ level, onChange }) {
  return (
    <div style={{ marginBottom: "12px" }}>
      <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "6px" }}>Hint level</div>
      <div style={{ display: "flex", gap: "6px" }}>
        {[1, 2, 3].map((l) => (
          <button key={l} onClick={() => onChange(l)} style={{
            flex: 1, padding: "6px", borderRadius: "6px", border: "1px solid",
            borderColor: level === l ? "var(--color-brand)" : "var(--surface-border)",
            background: level === l ? "rgba(0,212,255,0.1)" : "transparent",
            color: level === l ? "var(--color-brand)" : "var(--text-muted)",
            fontSize: "12px", fontWeight: level === l ? 600 : 400, cursor: "pointer",
          }}>
            {l === 1 ? "Nudge" : l === 2 ? "Approach" : "Concrete"}
          </button>
        ))}
      </div>
    </div>
  );
}

function ChatInput({ onSend, disabled }) {
  const [text, setText] = useState("");
  const ref = useRef(null);

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (text.trim()) { onSend(text.trim()); setText(""); }
    }
  }

  return (
    <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
      <textarea
        ref={ref}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKey}
        disabled={disabled}
        placeholder="Ask anything… (Enter to send)"
        rows={2}
        style={{
          flex: 1, background: "var(--surface-2)", border: "1px solid var(--surface-border)",
          borderRadius: "8px", padding: "8px 10px", fontSize: "13px",
          color: "var(--text-primary)", resize: "none", outline: "none",
          fontFamily: "var(--font-sans)", opacity: disabled ? 0.6 : 1,
        }}
      />
      <Button
        size="sm"
        disabled={disabled || !text.trim()}
        onClick={() => { if (text.trim()) { onSend(text.trim()); setText(""); } }}
        style={{ alignSelf: "flex-end" }}
      >↑</Button>
    </div>
  );
}

export default function AiPanel({ problem, code, language, verdict, failedTestIndex, onClose }) {
  const { content, isStreaming, error, call, reset } = useAI();
  const [activeFeature, setActiveFeature] = useState("hint");
  const [hintLevel, setHintLevel] = useState(1);
  const [usage, setUsage] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const contentRef = useRef(null);

  // Fetch daily usage on mount
  useEffect(() => {
    getAiUsage().then(setUsage).catch(() => {});
  }, []);

  // Auto-scroll content area as tokens stream in
  useEffect(() => {
    if (contentRef.current && isStreaming) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [content, isStreaming]);

  function buildBody(featureId, chatMessage) {
    const base = { code, language };
    const withProblem = { ...base, problemId: problem?._id };
    switch (featureId) {
      case "hint":          return { ...withProblem, hintLevel, verdict };
      case "complexity":    return base;
      case "review":        return { ...withProblem, verdict };
      case "explain":       return base;
      case "debug":         return { ...withProblem, verdict, failedTestIndex };
      case "optimal":       return withProblem;
      case "learning-path": return { ...withProblem, verdict };
      case "chat":          return { problemId: problem?._id, message: chatMessage, history: chatHistory };
      default:              return base;
    }
  }

  function triggerFeature(featureId, chatMessage) {
    reset();
    const endpoint = `/ai/${featureId}`;
    const body = buildBody(featureId, chatMessage);
    call(endpoint, body);
    // Refresh usage count
    getAiUsage().then(setUsage).catch(() => {});
  }

  function handleFeatureClick(featureId) {
    setActiveFeature(featureId);
    if (featureId !== "chat") triggerFeature(featureId);
    else reset();
  }

  function handleChatSend(message) {
    const newHistory = [...chatHistory, { role: "user", content: message }];
    setChatHistory(newHistory);
    reset();
    call("/ai/chat", { problemId: problem?._id, message, history: chatHistory });
    // append assistant placeholder, will fill on next send
    getAiUsage().then(setUsage).catch(() => {});
  }

  const activeFeatureMeta = FEATURES.find((f) => f.id === activeFeature);

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100%",
      background: "var(--surface-1)", borderLeft: "1px solid var(--surface-border)",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "12px 16px", borderBottom: "1px solid var(--surface-border)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "16px" }}>✨</span>
          <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-brand)" }}>AI Coach</span>
          <span style={{ fontSize: "11px", color: "var(--text-muted)", background: "var(--surface-2)", padding: "2px 7px", borderRadius: "99px" }}>
            Qwen3 Coder
          </span>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "18px", lineHeight: 1 }}>×</button>
      </div>

      {/* Usage bar */}
      {usage && (
        <div style={{ padding: "10px 16px 0", flexShrink: 0 }}>
          <UsageBar used={usage.used} limit={usage.limit} />
        </div>
      )}

      {/* Feature tabs */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: "4px",
        padding: "8px 12px", borderBottom: "1px solid var(--surface-border)",
        flexShrink: 0,
      }}>
        {FEATURES.map((f) => (
          <button
            key={f.id}
            onClick={() => handleFeatureClick(f.id)}
            title={f.desc}
            style={{
              padding: "5px 10px", borderRadius: "6px", border: "1px solid",
              fontSize: "12px", fontWeight: 500, cursor: "pointer",
              borderColor: activeFeature === f.id ? "var(--color-brand)" : "transparent",
              background: activeFeature === f.id ? "rgba(0,212,255,0.1)" : "transparent",
              color: activeFeature === f.id ? "var(--color-brand)" : "var(--text-muted)",
              transition: "all 120ms",
            }}
          >
            {f.icon} {f.label}
          </button>
        ))}
      </div>

      {/* Hint level selector */}
      {activeFeature === "hint" && (
        <div style={{ padding: "10px 16px 0", flexShrink: 0 }}>
          <HintLevelSelector level={hintLevel} onChange={(l) => { setHintLevel(l); triggerFeature("hint"); }} />
          <Button size="sm" isLoading={isStreaming} onClick={() => triggerFeature("hint")} fullWidth>
            {isStreaming ? "Thinking…" : "Get Hint"}
          </Button>
        </div>
      )}

      {/* Action button for non-chat, non-hint features */}
      {activeFeature !== "hint" && activeFeature !== "chat" && !content && !isStreaming && (
        <div style={{ padding: "12px 16px 0", flexShrink: 0 }}>
          <Button size="sm" onClick={() => triggerFeature(activeFeature)} fullWidth>
            {activeFeatureMeta?.icon} Run {activeFeatureMeta?.label}
          </Button>
        </div>
      )}

      {/* Content area */}
      <div
        ref={contentRef}
        style={{ flex: 1, overflowY: "auto", padding: "14px 16px", minHeight: 0 }}
      >
        {/* Streaming indicator */}
        {isStreaming && !content && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-muted)", fontSize: "13px" }}>
            <Spinner size={14} color="var(--color-brand)" />
            <span>Generating…</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ background: "rgba(255,23,68,0.08)", border: "1px solid rgba(255,23,68,0.2)", borderRadius: "8px", padding: "10px 12px", fontSize: "13px", color: "var(--color-red)", marginBottom: "10px" }}>
            {error}
          </div>
        )}

        {/* AI response */}
        {content && (
          <div style={{ position: "relative" }}>
            <MarkdownContent content={content} />
            {isStreaming && (
              <span style={{
                display: "inline-block", width: "2px", height: "14px",
                background: "var(--color-brand)", marginLeft: "2px",
                animation: "blink 1s step-end infinite",
                verticalAlign: "text-bottom",
              }} />
            )}
          </div>
        )}

        {/* Chat history */}
        {activeFeature === "chat" && chatHistory.length > 0 && !content && (
          <div style={{ fontSize: "13px", color: "var(--text-muted)", textAlign: "center", padding: "20px 0" }}>
            {chatHistory.length} messages in history
          </div>
        )}

        {/* Empty state */}
        {!content && !isStreaming && !error && activeFeature !== "hint" && (
          <div style={{ textAlign: "center", padding: "30px 0" }}>
            <div style={{ fontSize: "32px", marginBottom: "10px" }}>{activeFeatureMeta?.icon}</div>
            <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>{activeFeatureMeta?.desc}</div>
            {activeFeature !== "chat" && (
              <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px", opacity: 0.7 }}>
                Click the button above to start
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chat input */}
      {activeFeature === "chat" && (
        <div style={{ padding: "0 12px 12px", flexShrink: 0, borderTop: "1px solid var(--surface-border)", paddingTop: "10px" }}>
          <ChatInput onSend={handleChatSend} disabled={isStreaming} />
        </div>
      )}

      {/* Re-run button */}
      {content && !isStreaming && activeFeature !== "chat" && (
        <div style={{ padding: "8px 16px", borderTop: "1px solid var(--surface-border)", flexShrink: 0, display: "flex", gap: "8px" }}>
          <Button variant="outline" size="sm" onClick={() => triggerFeature(activeFeature)} style={{ flex: 1 }}>
            ↺ Regenerate
          </Button>
          <Button variant="ghost" size="sm" onClick={reset}>Clear</Button>
        </div>
      )}

      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
    </div>
  );
}
