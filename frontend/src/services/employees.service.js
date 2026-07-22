import { request } from './http.js';

export const employeesService = {
  async getAll() {
    return request('/employees');
  },

  async create(employeeData) {
    return request('/employees', {
      method: 'POST',
      body: JSON.stringify(employeeData),
    });
  },

  async updatePersonalInfo(id, personalData) {
    return request(`/employees/${id}/personal-info`, {
      method: 'PATCH',
      body: JSON.stringify(personalData),
    });
  },

  async submitJobTransfer(transferData) {
    return request('/employees/job-transfers', {
      method: 'POST',
      body: JSON.stringify(transferData),
    });
  },

  async submitSalaryAdjustment(salaryData) {
    return request('/employees/salary-adjustments', {
      method: 'POST',
      body: JSON.stringify(salaryData),
    });
  },

  async submitDisciplineReward(data) {
    return request('/employees/discipline-rewards', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
