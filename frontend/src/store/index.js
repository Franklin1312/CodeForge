import { configureStore } from "@reduxjs/toolkit";
import authReducer        from "./slices/authSlice.js";
import problemsReducer    from "./slices/problemsSlice.js";
import submissionsReducer from "./slices/submissionsSlice.js";

export const store = configureStore({
  reducer: {
    auth:        authReducer,
    problems:    problemsReducer,
    submissions: submissionsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: { ignoredActions: ["auth/setCredentials"] },
    }),
  devTools: import.meta.env.DEV,
});

export default store;
