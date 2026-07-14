import api, { refreshSession } from "./client.js";

// All auth calls go through the shared Axios instance which:
//   - Attaches the Bearer token on every request
//   - Automatically retries with a fresh token on 401
//   - Sends the httpOnly refresh cookie via `withCredentials: true`

export const authApi = {
  /**
   * Register a new account.
   * @param {{ username, email, password }} data
   * @returns {{ user, accessToken }}
   */
  register: async (data) => {
    const res = await api.post("/auth/register", data);
    return res.data;
  },

  /**
   * Log in with email + password.
   * @param {{ email, password }} data
   * @returns {{ user, accessToken }}
   */
  login: async (data) => {
    const res = await api.post("/auth/login", data);
    return res.data;
  },

  /**
   * Exchange the httpOnly refresh cookie for a new access token.
   * Called automatically by the Axios interceptor — rarely called directly.
   * @returns {{ user, accessToken }}
   */
  refresh: async () => {
    return refreshSession();
  },

  /**
   * Revoke the current session's refresh token.
   */
  logout: async () => {
    const res = await api.delete("/auth/logout");
    return res.data;
  },

  /**
   * Revoke ALL sessions for the current user (sign out everywhere).
   */
  logoutAll: async () => {
    const res = await api.delete("/auth/logout-all");
    return res.data;
  },

  /**
   * Fetch the current user's profile using the stored access token.
   * Used on app boot to rehydrate auth state.
   * @returns {{ user }}
   */
  me: async () => {
    const res = await api.get("/auth/me");
    return res.data;
  },
};

export default authApi;
