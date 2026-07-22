import { request } from './http.js';

export const auditLogsService = {
  async getAll(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    return request(`/audit-logs?${queryParams}`);
  },

  async getDiff(id) {
    return request(`/audit-logs/${id}/diff`);
  },
};
