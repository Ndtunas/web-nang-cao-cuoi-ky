import { request } from './http.js';

export const approvalsService = {
  async getPendingMyLevel() {
    return request('/approval-requests/pending-my-level');
  },

  async getMySubmitted() {
    return request('/approval-requests/my-submitted');
  },

  async approve(requestId, comment = '') {
    return request(`/approval-requests/${requestId}/approve`, {
      method: 'PATCH',
      body: JSON.stringify({ comment }),
    });
  },

  async reject(requestId, comment) {
    return request(`/approval-requests/${requestId}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ comment }),
    });
  },

  async getHistory(requestId) {
    return request(`/approval-requests/${requestId}/history`);
  },

  async getDetail(requestId) {
    return request(`/approval-requests/${requestId}/detail`);
  },
};
