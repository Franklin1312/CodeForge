import axios from "axios";
import { store } from "../store/index.js";
import { refreshAccessToken, clearCredentials } from "../store/slices/authSlice.js";

const BASE_URL = import.meta.env.VITE_API_URL || "/api";

// Primary axios instance — attaches JWT to every request
export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // send httpOnly refresh cookie
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

// Shared bare client for refresh endpoint calls.
// It has no auth interceptors, which prevents refresh-on-refresh loops.
const refreshClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

let refreshSessionPromise = null;

export async function refreshSession() {
  if (!refreshSessionPromise) {
    refreshSessionPromise = refreshClient
      .post("/auth/refresh")
      .then((res) => res.data)
      .finally(() => {
        refreshSessionPromise = null;
      });
  }

  return refreshSessionPromise;
}

// ─── Request interceptor — attach access token ────────────────────
api.interceptors.request.use(
  (config) => {
    const { accessToken } = store.getState().auth;
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response interceptor — silent token refresh ──────────────────

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const requestUrl = originalRequest?.url || "";
    const isRefreshRequest = requestUrl.includes("/auth/refresh");

    // If 401 and we haven't retried yet
    if (
      error.response?.status === 401 &&
      !isRefreshRequest &&
      !originalRequest._retry &&
      error.response?.data?.error?.code !== "INVALID_CREDENTIALS"
    ) {
      originalRequest._retry = true;

      try {
        const { accessToken: newToken } = await refreshSession();
        store.dispatch(refreshAccessToken({ accessToken: newToken }));

        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        store.dispatch(clearCredentials());
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
