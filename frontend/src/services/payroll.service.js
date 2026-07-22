import { request } from './http.js';

export const payrollService = {
  async calculate(month, year) {
    return request('/payroll/calculate-monthly', {
      method: 'POST',
      body: JSON.stringify({ month, year }),
    });
  },

  async getSalaries(month, year) {
    return request(`/payroll/salaries?month=${month}&year=${year}`);
  },
};
