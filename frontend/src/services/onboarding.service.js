import { request } from './http.js';

export const onboardingService = {
  async initiate(payload) {
    return request('/onboarding/initiate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getAllTasks() {
    return request('/onboarding/tasks');
  },

  async getByDepartment(dept) {
    return request(`/onboarding/tasks/${dept}`);
  },

  async getByEmployee(employeeId) {
    return request(`/onboarding/employee/${employeeId}`);
  },

  async completeTask(taskId) {
    return request(`/onboarding/tasks/${taskId}/complete`, { method: 'PATCH' });
  },

  async promote(employeeId) {
    return request(`/onboarding/promote/${employeeId}`, { method: 'PATCH' });
  },
};
