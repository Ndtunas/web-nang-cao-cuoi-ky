import { request } from './http.js';

export const configsService = {
  async getWorkRates() {
    return request('/config/work-rates');
  },

  async updateWorkRate(key, valueMultiplier) {
    return request(`/config/work-rates/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ valueMultiplier }),
    });
  },

  async getApprovalConfigs() {
    return request('/approval-configs');
  },

  async updateApprovalConfig(transactionType, requiredLevels) {
    return request(`/approval-configs/${transactionType}`, {
      method: 'PUT',
      body: JSON.stringify({ requiredLevels }),
    });
  },
};
