import { request } from './http.js';

export const offboardingService = {
  async submitResignation(reason) {
    return request('/offboarding/resignation-request', {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  async getTasksByEmployee(employeeId) {
    return request(`/offboarding/tasks/${employeeId}`);
  },

  async getAllPendingTasks() {
    return request('/offboarding/tasks');
  },

  async completeTask(taskId) {
    return request(`/offboarding/tasks/${taskId}/complete`, { method: 'PATCH' });
  },

  async checkAllCompleted(employeeId) {
    return request(`/offboarding/check-completed/${employeeId}`);
  },
};
