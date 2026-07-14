import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useCallback } from "react";
import toast from "react-hot-toast";
import {
  setCredentials,
  clearCredentials,
  setAuthLoading,
  setAuthError,
  selectCurrentUser,
  selectIsAuthenticated,
  selectAuthLoading,
  selectAuthError,
  selectUserRole,
} from "../store/slices/authSlice.js";
import authApi from "../api/auth.js";

export function useAuth() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Selectors
  const user = useSelector(selectCurrentUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isLoading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError);
  const role = useSelector(selectUserRole);

  // ─── Register ───────────────────────────────────────────────────
  const register = useCallback(
    async (data) => {
      dispatch(setAuthLoading(true));
      try {
        const { user, accessToken } = await authApi.register(data);
        dispatch(setCredentials({ user, accessToken }));
        toast.success(`Welcome to CodeForge, ${user.username}!`);
        navigate("/problems");
      } catch (err) {
        const message = err.response?.data?.error?.message || "Registration failed";
        dispatch(setAuthError(message));
        toast.error(message);
        throw err; // re-throw so form can handle field-level errors
      } finally {
        dispatch(setAuthLoading(false));
      }
    },
    [dispatch, navigate]
  );

  // ─── Login ──────────────────────────────────────────────────────
  const login = useCallback(
    async (data, options = {}) => {
      dispatch(setAuthLoading(true));
      try {
        const { user, accessToken } = await authApi.login(data);
        dispatch(setCredentials({ user, accessToken }));
        toast.success(`Welcome back, ${user.username}!`);
        navigate(options.redirectTo || "/problems");
      } catch (err) {
        const message = err.response?.data?.error?.message || "Login failed";
        dispatch(setAuthError(message));
        toast.error(message);
        throw err;
      } finally {
        dispatch(setAuthLoading(false));
      }
    },
    [dispatch, navigate]
  );

  // ─── Logout ─────────────────────────────────────────────────────
  const logout = useCallback(
    async ({ all = false } = {}) => {
      try {
        if (all) {
          await authApi.logoutAll();
          toast.success("Signed out from all devices");
        } else {
          await authApi.logout();
          toast.success("Signed out");
        }
      } catch {
        // Silently fail — clear local state regardless
      } finally {
        dispatch(clearCredentials());
        navigate("/login");
      }
    },
    [dispatch, navigate]
  );

  // ─── Rehydrate on app boot ──────────────────────────────────────
  // Call this once in App.jsx on mount. Uses the httpOnly cookie to
  // get a fresh access token + user without requiring the user to log in again.
  const rehydrate = useCallback(async () => {
    dispatch(setAuthLoading(true));
    try {
      const { user, accessToken } = await authApi.refresh();
      dispatch(setCredentials({ user, accessToken }));
    } catch {
      // No valid session — stays logged out, no error shown
      dispatch(clearCredentials());
    } finally {
      dispatch(setAuthLoading(false));
    }
  }, [dispatch]);

  // ─── Role helpers ────────────────────────────────────────────────
  const isAdmin = role === "admin";
  const isPremium = role === "premium" || role === "admin";

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    role,
    isAdmin,
    isPremium,
    register,
    login,
    logout,
    rehydrate,
  };
}

export default useAuth;
