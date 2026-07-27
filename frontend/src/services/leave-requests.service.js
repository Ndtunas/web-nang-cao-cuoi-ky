import { request } from './http.js';

export const leaveService = {
  async submit(payload) {
    return request('/leave-requests', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getMyRequests() {
    return request('/leave-requests/my-requests');
  },

  async getAll() {
    return request('/leave-requests');
  },

  async cancel(id) {
    return request(`/leave-requests/${id}`, { method: 'DELETE' });
  },
};
