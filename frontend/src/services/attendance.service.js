import { request } from './http.js';

export const attendanceService = {
  async checkIn() {
    return request('/attendance/check-in', { method: 'POST' });
  },

  async checkOut() {
    return request('/attendance/check-out', { method: 'POST' });
  },

  async getToday() {
    return request('/attendance/today');
  },

  async getTodayStatus() {
    return request('/attendance/today-status');
  },

  async getMyHistory() {
    return request('/attendance/my-history');
  },

  async getStatsMonth(month, year) {
    return request(`/attendance/stats-month?month=${month}&year=${year}`);
  },

  async getAll(dateFrom, dateTo) {
    const qs = new URLSearchParams();
    if (dateFrom) qs.set('dateFrom', dateFrom);
    if (dateTo) qs.set('dateTo', dateTo);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return request(`/attendance${suffix}`);
  },
};
