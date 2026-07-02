import api from "./client.js";

export const problemsApi = {
  // ─── Public ─────────────────────────────────────────────────────

  /** List problems with optional filters */
  list: async (params = {}) => {
    const res = await api.get("/problems", { params });
    return res.data; // { problems, pagination }
  },

  /** Get all available tags */
  getTags: async () => {
    const res = await api.get("/problems/tags");
    return res.data; // { tags: string[] }
  },

  /** Get a single problem by slug */
  getBySlug: async (slug) => {
    const res = await api.get(`/problems/${slug}`);
    return res.data; // { problem }
  },

  // ─── Admin ──────────────────────────────────────────────────────

  /** Get full problem data (admin — includes hidden test cases) */
  getAdminById: async (id) => {
    const res = await api.get(`/problems/${id}/admin`);
    return res.data; // { problem }
  },

  /** Create a new problem */
  create: async (data) => {
    const res = await api.post("/problems", data);
    return res.data; // { message, problem }
  },

  /** Partial update */
  update: async (id, data) => {
    const res = await api.patch(`/problems/${id}`, data);
    return res.data; // { message, problem }
  },

  /** Delete problem */
  delete: async (id) => {
    const res = await api.delete(`/problems/${id}`);
    return res.data; // { message }
  },

  /** Toggle published state */
  togglePublish: async (id) => {
    const res = await api.patch(`/problems/${id}/publish`);
    return res.data; // { message, problem }
  },
};

export default problemsApi;
