import api from "./client.js";

export const submissionsApi = {
  /** Submit code for a problem */
  submit: async ({ problemId, language, code }) => {
    const res = await api.post("/submissions", { problemId, language, code });
    return res.data; // { submissionId, jobId, verdict, problemSlug }
  },

  /** Get a single submission (owner or admin) */
  getById: async (id) => {
    const res = await api.get(`/submissions/${id}`);
    return res.data; // { submission }
  },

  /** List current user's submissions */
  getMine: async (params = {}) => {
    const res = await api.get("/submissions/me", { params });
    return res.data; // { submissions, pagination }
  },
};

export default submissionsApi;
