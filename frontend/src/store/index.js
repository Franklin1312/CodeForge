import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice.js";
import problemsReducer from "./slices/problemsSlice.js";
// Stage 5: import submissionsReducer from "./slices/submissionsSlice.js";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    problems: problemsReducer,
    // submissions: submissionsReducer, // Stage 5
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["auth/setCredentials"],
      },
    }),
  devTools: import.meta.env.DEV,
});

export default store;
