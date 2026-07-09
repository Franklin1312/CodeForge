import { store } from "../store/index.js";

const BASE_URL = import.meta.env.VITE_API_URL || "/api";

/**
 * Stream an AI response via SSE (Server-Sent Events).
 *
 * Usage:
 *   for await (const chunk of streamAI("/ai/hint", body)) {
 *     setContent((prev) => prev + chunk);
 *   }
 *
 * Yields string chunks as they arrive.
 * Throws on error events from the server.
 */
export async function* streamAI(endpoint, body) {
  const token = store.getState().auth.accessToken;

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method:  "POST",
    headers: {
      "Content-Type":  "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: "Request failed" } }));
    throw new Error(err.error?.message || `HTTP ${response.status}`);
  }

  const reader  = response.body.getReader();
  const decoder = new TextDecoder();
  let   buffer  = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop(); // keep incomplete last line

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data: ")) continue;

      try {
        const msg = JSON.parse(trimmed.slice(6));

        if (msg.type === "chunk") {
          yield msg.content;
        } else if (msg.type === "error") {
          throw new Error(msg.message || "AI error");
        }
        // "done" type — just ignore, generator will end naturally
      } catch (e) {
        if (e.message !== "AI error") continue; // skip parse errors
        throw e;
      }
    }
  }
}

/**
 * Collect the full streamed response into a string.
 * Use this when you don't need to show streaming.
 */
export async function callAI(endpoint, body) {
  let result = "";
  for await (const chunk of streamAI(endpoint, body)) {
    result += chunk;
  }
  return result;
}

/**
 * Fetch AI usage stats for the current user.
 */
export async function getAiUsage() {
  const token = store.getState().auth.accessToken;
  const res = await fetch(`${BASE_URL}/ai/usage`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
  });
  const data = await res.json();
  return data.usage; // { used, limit, remaining }
}

export default { streamAI, callAI, getAiUsage };
