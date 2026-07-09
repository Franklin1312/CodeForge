import { useState, useCallback, useRef } from "react";
import { streamAI } from "../api/ai.js";
import toast from "react-hot-toast";

/**
 * useAI — manages streaming state for a single AI feature call.
 *
 * Returns:
 *   content    — accumulated markdown string
 *   isStreaming — true while tokens are arriving
 *   error      — error message string or null
 *   call(endpoint, body) — trigger the stream
 *   reset()    — clear content + error
 */
export function useAI() {
  const [content,     setContent]     = useState("");
  const [isStreaming, setIsStreaming]  = useState(false);
  const [error,       setError]       = useState(null);
  const abortRef = useRef(false);

  const call = useCallback(async (endpoint, body) => {
    abortRef.current = false;
    setContent("");
    setError(null);
    setIsStreaming(true);

    try {
      for await (const chunk of streamAI(endpoint, body)) {
        if (abortRef.current) break;
        setContent((prev) => prev + chunk);
      }
    } catch (err) {
      if (abortRef.current) return; // cancelled by user — not an error

      const msg = err.message || "AI request failed";
      setError(msg);

      // Show toast for rate limit — user needs to know
      if (msg.includes("limit") || msg.includes("rate")) {
        toast.error(msg, { duration: 6000 });
      } else {
        toast.error("AI unavailable — try again shortly");
      }
    } finally {
      setIsStreaming(false);
    }
  }, []);

  const reset = useCallback(() => {
    abortRef.current = true;
    setContent("");
    setError(null);
    setIsStreaming(false);
  }, []);

  return { content, isStreaming, error, call, reset };
}

export default useAI;
