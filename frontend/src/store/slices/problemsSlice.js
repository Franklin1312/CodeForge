import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import problemsApi from "../../api/problems.js";

// ─── Async thunks ─────────────────────────────────────────────────
export const fetchProblems = createAsyncThunk(
  "problems/fetchList",
  async (params, { rejectWithValue }) => {
    try {
      return await problemsApi.list(params);
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || "Failed to load problems");
    }
  }
);

export const fetchProblemBySlug = createAsyncThunk(
  "problems/fetchBySlug",
  async (slug, { rejectWithValue }) => {
    try {
      const data = await problemsApi.getBySlug(slug);
      return data.problem;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || "Problem not found");
    }
  }
);

export const createProblem = createAsyncThunk(
  "problems/create",
  async (data, { rejectWithValue }) => {
    try {
      const res = await problemsApi.create(data);
      return res.problem;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || "Failed to create problem");
    }
  }
);

export const updateProblem = createAsyncThunk(
  "problems/update",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await problemsApi.update(id, data);
      return res.problem;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || "Failed to update problem");
    }
  }
);

export const deleteProblem = createAsyncThunk(
  "problems/delete",
  async (id, { rejectWithValue }) => {
    try {
      await problemsApi.delete(id);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || "Failed to delete problem");
    }
  }
);

export const togglePublish = createAsyncThunk(
  "problems/togglePublish",
  async (id, { rejectWithValue }) => {
    try {
      const res = await problemsApi.togglePublish(id);
      return res.problem;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || "Failed to update problem");
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────────
const problemsSlice = createSlice({
  name: "problems",
  initialState: {
    // List state
    items: [],
    pagination: null,
    filters: { difficulty: "", tags: [], search: "" },
    listStatus: "idle", // idle | loading | succeeded | failed
    listError: null,

    // Detail state
    currentProblem: null,
    detailStatus: "idle",
    detailError: null,

    // Mutation state
    mutationStatus: "idle",
    mutationError: null,
  },
  reducers: {
    setFilters(state, action) {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters(state) {
      state.filters = { difficulty: "", tags: [], search: "" };
    },
    clearCurrentProblem(state) {
      state.currentProblem = null;
      state.detailStatus = "idle";
      state.detailError = null;
    },
    clearMutationError(state) {
      state.mutationError = null;
      state.mutationStatus = "idle";
    },
  },
  extraReducers: (builder) => {
    // List
    builder
      .addCase(fetchProblems.pending, (state) => {
        state.listStatus = "loading";
        state.listError = null;
      })
      .addCase(fetchProblems.fulfilled, (state, action) => {
        state.listStatus = "succeeded";
        state.items = action.payload.problems;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchProblems.rejected, (state, action) => {
        state.listStatus = "failed";
        state.listError = action.payload;
      });

    // Detail
    builder
      .addCase(fetchProblemBySlug.pending, (state) => {
        state.detailStatus = "loading";
        state.detailError = null;
      })
      .addCase(fetchProblemBySlug.fulfilled, (state, action) => {
        state.detailStatus = "succeeded";
        state.currentProblem = action.payload;
      })
      .addCase(fetchProblemBySlug.rejected, (state, action) => {
        state.detailStatus = "failed";
        state.detailError = action.payload;
      });

    // Create
    builder
      .addCase(createProblem.pending, (state) => { state.mutationStatus = "loading"; })
      .addCase(createProblem.fulfilled, (state, action) => {
        state.mutationStatus = "succeeded";
        state.items.unshift(action.payload);
      })
      .addCase(createProblem.rejected, (state, action) => {
        state.mutationStatus = "failed";
        state.mutationError = action.payload;
      });

    // Update
    builder
      .addCase(updateProblem.pending, (state) => { state.mutationStatus = "loading"; })
      .addCase(updateProblem.fulfilled, (state, action) => {
        state.mutationStatus = "succeeded";
        const idx = state.items.findIndex((p) => p._id === action.payload._id);
        if (idx !== -1) state.items[idx] = action.payload;
        if (state.currentProblem?._id === action.payload._id) {
          state.currentProblem = action.payload;
        }
      })
      .addCase(updateProblem.rejected, (state, action) => {
        state.mutationStatus = "failed";
        state.mutationError = action.payload;
      });

    // Delete
    builder
      .addCase(deleteProblem.pending, (state) => { state.mutationStatus = "loading"; })
      .addCase(deleteProblem.fulfilled, (state, action) => {
        state.mutationStatus = "succeeded";
        state.items = state.items.filter((p) => p._id !== action.payload);
      })
      .addCase(deleteProblem.rejected, (state, action) => {
        state.mutationStatus = "failed";
        state.mutationError = action.payload;
      });

    // Toggle publish
    builder
      .addCase(togglePublish.fulfilled, (state, action) => {
        const idx = state.items.findIndex((p) => p._id === action.payload._id);
        if (idx !== -1) state.items[idx] = action.payload;
      });
  },
});

export const { setFilters, clearFilters, clearCurrentProblem, clearMutationError } =
  problemsSlice.actions;

// ─── Selectors ────────────────────────────────────────────────────
export const selectProblems       = (s) => s.problems.items;
export const selectPagination     = (s) => s.problems.pagination;
export const selectFilters        = (s) => s.problems.filters;
export const selectListStatus     = (s) => s.problems.listStatus;
export const selectListError      = (s) => s.problems.listError;
export const selectCurrentProblem = (s) => s.problems.currentProblem;
export const selectDetailStatus   = (s) => s.problems.detailStatus;
export const selectMutationStatus = (s) => s.problems.mutationStatus;
export const selectMutationError  = (s) => s.problems.mutationError;

export default problemsSlice.reducer;
