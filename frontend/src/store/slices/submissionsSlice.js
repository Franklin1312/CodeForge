import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import submissionsApi from "../../api/submissions.js";

export const submitCode = createAsyncThunk(
  "submissions/submit",
  async (payload, { rejectWithValue }) => {
    try {
      return await submissionsApi.submit(payload);
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || "Submission failed");
    }
  }
);

export const fetchSubmission = createAsyncThunk(
  "submissions/fetchById",
  async (id, { rejectWithValue }) => {
    try {
      const data = await submissionsApi.getById(id);
      return data.submission;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || "Not found");
    }
  }
);

export const fetchMySubmissions = createAsyncThunk(
  "submissions/fetchMine",
  async (params, { rejectWithValue }) => {
    try {
      return await submissionsApi.getMine(params);
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || "Failed to load");
    }
  }
);

const submissionsSlice = createSlice({
  name: "submissions",
  initialState: {
    // Active submission being judged
    active:        null,   // { submissionId, verdict, testResults, runtime, memory, ... }
    activeStatus:  "idle", // idle | loading | judging | done | failed

    // List
    items:         [],
    pagination:    null,
    listStatus:    "idle",

    error:         null,
  },
  reducers: {
    // Called by the WebSocket hook when a live update arrives
    applyVerdictUpdate(state, action) {
      const { submissionId, verdict, runtime, memory, testResults, compileError } = action.payload;
      if (state.active?.submissionId === submissionId) {
        state.active = { ...state.active, verdict, runtime, memory, testResults, compileError };
        if (verdict !== "pending" && verdict !== "running") {
          state.activeStatus = "done";
        }
      }
    },
    clearActive(state) {
      state.active       = null;
      state.activeStatus = "idle";
      state.error        = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(submitCode.pending,    (state) => { state.activeStatus = "loading"; state.error = null; })
      .addCase(submitCode.fulfilled,  (state, action) => {
        state.active       = { ...action.payload, testResults: [] };
        state.activeStatus = "judging";
      })
      .addCase(submitCode.rejected,   (state, action) => {
        state.activeStatus = "failed";
        state.error        = action.payload;
      });

    builder
      .addCase(fetchSubmission.fulfilled, (state, action) => {
        state.active       = action.payload;
        state.activeStatus = "done";
      });

    builder
      .addCase(fetchMySubmissions.pending,   (state) => { state.listStatus = "loading"; })
      .addCase(fetchMySubmissions.fulfilled, (state, action) => {
        state.listStatus = "succeeded";
        state.items      = action.payload.submissions;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchMySubmissions.rejected, (state, action) => {
        state.listStatus = "failed";
        state.error      = action.payload;
      });
  },
});

export const { applyVerdictUpdate, clearActive } = submissionsSlice.actions;

export const selectActiveSubmission  = (s) => s.submissions.active;
export const selectActiveStatus      = (s) => s.submissions.activeStatus;
export const selectMySubmissions     = (s) => s.submissions.items;
export const selectSubmissionsPagination = (s) => s.submissions.pagination;
export const selectSubmissionsError  = (s) => s.submissions.error;

export default submissionsSlice.reducer;
