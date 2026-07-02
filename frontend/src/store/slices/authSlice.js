import { createSlice } from "@reduxjs/toolkit";

// Auth state shape
// accessToken lives in memory ONLY (never localStorage)
// User info is persisted in Redux state (hydrated on app init via /auth/me)
const initialState = {
  user: null,          // { id, username, email, role }
  accessToken: null,   // short-lived JWT (in memory)
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    // Called after successful login/register
    setCredentials: (state, action) => {
      const { user, accessToken } = action.payload;
      state.user = user;
      state.accessToken = accessToken;
      state.isAuthenticated = true;
      state.error = null;
    },

    // Called on logout or token revocation
    clearCredentials: (state) => {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      state.error = null;
    },

    // Refresh token rotation — update access token only
    refreshAccessToken: (state, action) => {
      state.accessToken = action.payload.accessToken;
    },

    setAuthLoading: (state, action) => {
      state.isLoading = action.payload;
    },

    setAuthError: (state, action) => {
      state.error = action.payload;
      state.isLoading = false;
    },
  },
});

export const {
  setCredentials,
  clearCredentials,
  refreshAccessToken,
  setAuthLoading,
  setAuthError,
} = authSlice.actions;

// Selectors
export const selectCurrentUser = (state) => state.auth.user;
export const selectAccessToken = (state) => state.auth.accessToken;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectAuthLoading = (state) => state.auth.isLoading;
export const selectAuthError = (state) => state.auth.error;
export const selectUserRole = (state) => state.auth.user?.role;

export default authSlice.reducer;
