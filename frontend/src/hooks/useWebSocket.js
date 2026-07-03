import { useEffect, useRef, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { applyVerdictUpdate } from "../store/slices/submissionsSlice.js";
import { selectAccessToken } from "../store/slices/authSlice.js";

const WS_BASE = import.meta.env.VITE_WS_URL ||
  `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/ws`;

const RECONNECT_DELAYS = [1000, 2000, 5000]; // ms

/**
 * Subscribes to live judge verdict updates for a submission.
 *
 * Usage:
 *   useSubmissionWebSocket(submissionId);   // starts when submissionId is truthy
 *   useSubmissionWebSocket(null);           // disconnects / no-op
 */
export function useSubmissionWebSocket(submissionId) {
  const dispatch    = useDispatch();
  const accessToken = useSelector(selectAccessToken);
  const wsRef       = useRef(null);
  const retryCount  = useRef(0);
  const stopped     = useRef(false);

  const connect = useCallback(() => {
    if (!submissionId || !accessToken || stopped.current) return;

    const url = `${WS_BASE}?token=${accessToken}&submissionId=${submissionId}`;
    const ws  = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      retryCount.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "verdict") {
          dispatch(applyVerdictUpdate(msg));
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.onerror = () => {
      // onclose will handle reconnect
    };

    ws.onclose = (event) => {
      if (stopped.current) return;

      // 1008 = policy violation (auth failed) — don't retry
      if (event.code === 1008) return;

      // Final verdict received — server closes cleanly (code 1000)
      if (event.code === 1000) return;

      // Reconnect with backoff
      const delay = RECONNECT_DELAYS[Math.min(retryCount.current, RECONNECT_DELAYS.length - 1)];
      retryCount.current++;
      setTimeout(connect, delay);
    };
  }, [submissionId, accessToken, dispatch]);

  useEffect(() => {
    stopped.current = false;
    retryCount.current = 0;
    connect();

    return () => {
      stopped.current = true;
      if (wsRef.current) {
        wsRef.current.close(1000, "component unmounted");
        wsRef.current = null;
      }
    };
  }, [connect]);
}

export default useSubmissionWebSocket;
