import { useState, useRef, useEffect } from "react";
import { useAI } from "../../hooks/useAI.js";
import { getAiUsage } from "../../api/ai.js";
import MarkdownContent from "../../components/ui/MarkdownContent.jsx";
import { Button, Spinner } from "../../components/ui/index.jsx";

const QUICK_PROMPTS = [
  "Explain the two-pointer technique with an example",
  "When should I use a hash map vs a sorted array?",
  "What's the difference between DFS and BFS?",
  "How do I recognise a dynamic programming problem?",
  "Explain binary search on the answer",
  "What is a sliding window and when to use it?",
];

export default function AiCoachPage() {
  const { content, isStreaming, error, call, reset } = useAI();
  const [messages, setMessages]     = useState([]);
  const [input, setInput]           = useState("");
  const [usage, setUsage]           = useState(null);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    getAiUsage().then(setUsage).catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, content]);

  async function sendMessage(text) {
    if (!text.trim() || isStreaming) return;
    const userMsg = { role: "user", content: text };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput("");
    reset();

    await call("/ai/chat", {
      message: text,
      history: messages,
    });

    // After stream completes, capture content into history
    // (content is read from the hook state by the streaming section below)
    getAiUsage().then(setUsage).catch(() => {});
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  // Once streaming stops, add the AI response to history
  const prevStreamingRef = useRef(false);
  useEffect(() => {
    if (prevStreamingRef.current && !isStreaming && content) {
      setMessages((prev) => [...prev, { role: "assistant", content }]);
      reset();
    }
    prevStreamingRef.current = isStreaming;
  }, [isStreaming]); // eslint-disable-line

  return (
    <div style={{ maxWidth: "820px", margin: "0 auto", padding: "28px 24px", display: "flex", flexDirection: "column", height: "calc(100vh - 56px)" }}>
      {/* Header */}
      <div style={{ marginBottom: "20px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>
              ✨ AI Coach
            </h1>
            <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
              Powered by <strong style={{ color: "var(--color-brand)" }}>Qwen3 Coder</strong> via OpenRouter · Free tier
            </p>
          </div>
          {usage && (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Today</div>
              <div style={{ fontSize: "16px", fontWeight: 700, color: usage.remaining < 5 ? "var(--color-red)" : "var(--color-brand)" }}>
                {usage.remaining} left
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{usage.used}/{usage.limit}</div>
            </div>
          )}
        </div>
      </div>

      {/* Chat history */}
      <div style={{ flex: 1, overflowY: "auto", marginBottom: "16px", minHeight: 0 }}>
        {messages.length === 0 && !isStreaming && (
          <div style={{ textAlign: "center", paddingTop: "40px" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>🤖</div>
            <h2 style={{ fontSize: "18px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "8px" }}>
              Ask me anything about competitive programming
            </h2>
            <p style={{ fontSize: "14px", color: "var(--text-muted)", marginBottom: "28px" }}>
              Algorithms, data structures, problem solving strategies, code review…
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center" }}>
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => sendMessage(p)}
                  style={{
                    padding: "8px 14px", borderRadius: "99px", border: "1px solid var(--surface-border)",
                    background: "var(--surface-1)", color: "var(--text-secondary)", fontSize: "13px",
                    cursor: "pointer", transition: "all 150ms",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--color-brand)"; e.currentTarget.style.color = "var(--color-brand)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--surface-border)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{
            marginBottom: "16px",
            display: "flex",
            flexDirection: msg.role === "user" ? "row-reverse" : "row",
            gap: "10px",
            alignItems: "flex-start",
          }}>
            <div style={{
              width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0,
              background: msg.role === "user" ? "var(--color-brand)" : "var(--surface-3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "13px", color: msg.role === "user" ? "#0f1117" : "var(--text-secondary)",
              fontWeight: 700,
            }}>
              {msg.role === "user" ? "U" : "✨"}
            </div>
            <div style={{
              maxWidth: "85%",
              background: msg.role === "user" ? "rgba(0,212,255,0.08)" : "var(--surface-1)",
              border: "1px solid",
              borderColor: msg.role === "user" ? "rgba(0,212,255,0.2)" : "var(--surface-border)",
              borderRadius: msg.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
              padding: "10px 14px",
            }}>
              {msg.role === "user"
                ? <p style={{ fontSize: "14px", color: "var(--text-primary)", margin: 0 }}>{msg.content}</p>
                : <MarkdownContent content={msg.content} />}
            </div>
          </div>
        ))}

        {/* Live streaming response */}
        {isStreaming && (
          <div style={{ marginBottom: "16px", display: "flex", gap: "10px", alignItems: "flex-start" }}>
            <div style={{ width:"28px", height:"28px", borderRadius:"50%", background:"var(--surface-3)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"13px", color:"var(--color-brand)", flexShrink:0 }}>✨</div>
            <div style={{ maxWidth:"85%", background:"var(--surface-1)", border:"1px solid var(--surface-border)", borderRadius:"12px 12px 12px 2px", padding:"10px 14px" }}>
              {content
                ? <><MarkdownContent content={content} /><span style={{ display:"inline-block", width:"2px", height:"14px", background:"var(--color-brand)", marginLeft:"2px", verticalAlign:"text-bottom", animation:"blink 1s step-end infinite" }} /></>
                : <Spinner size={16} color="var(--color-brand)" />}
            </div>
          </div>
        )}

        {error && (
          <div style={{ background:"rgba(255,23,68,0.08)", border:"1px solid rgba(255,23,68,0.2)", borderRadius:"8px", padding:"10px 14px", fontSize:"13px", color:"var(--color-red)", marginBottom:"12px" }}>
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div style={{ flexShrink: 0, background: "var(--surface-1)", border: "1px solid var(--surface-border)", borderRadius: "12px", padding: "12px" }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask a question… (Enter to send, Shift+Enter for newline)"
          disabled={isStreaming}
          rows={3}
          style={{
            width: "100%", background: "transparent", border: "none", outline: "none",
            fontSize: "14px", color: "var(--text-primary)", resize: "none",
            fontFamily: "var(--font-sans)", lineHeight: "1.6",
            opacity: isStreaming ? 0.6 : 1,
          }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            Enter ↵ to send · Shift+Enter for newline
          </span>
          <div style={{ display: "flex", gap: "8px" }}>
            {messages.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => { setMessages([]); reset(); }}>Clear chat</Button>
            )}
            <Button size="sm" disabled={isStreaming || !input.trim()} onClick={() => sendMessage(input)}>
              {isStreaming ? <Spinner size={14} /> : "Send"}
            </Button>
          </div>
        </div>
      </div>

      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
    </div>
  );
}
