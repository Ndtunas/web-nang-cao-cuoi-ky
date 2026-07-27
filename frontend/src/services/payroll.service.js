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

  async approveMonthly(month, year, comment) {
    return request('/payroll/approve', {
      method: 'PATCH',
      body: JSON.stringify({ month, year, comment: comment || '' }),
    });
  },

  async getMyPayslip(month, year) {
    return request(`/payroll/my-payslip?month=${month}&year=${year}`);
  },
};
