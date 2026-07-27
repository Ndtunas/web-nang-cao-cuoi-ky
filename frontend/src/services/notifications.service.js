import { request } from './http.js';

export const notificationsService = {
  async getAll() {
    return request('/notifications');
  },

  async getUnreadCount() {
    return request('/notifications/unread-count');
  },

  async markAsRead(id) {
    return request(`/notifications/${id}/read`, { method: 'PATCH' });
  },

  async markAllRead() {
    return request('/notifications/mark-all-read', { method: 'PATCH' });
  },
};

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
    const params = new URLSearchParams();
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    return request(`/attendance?${params}`);
  },
};

export const departmentsService = {
  async getAll() {
    return request('/departments');
  },

  async create(payload) {
    return request('/departments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async update(id, payload) {
    return request(`/departments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async remove(id) {
    return request(`/departments/${id}`, { method: 'DELETE' });
  },
};

export const positionsService = {
  async getAll() {
    return request('/positions');
  },

  async create(payload) {
    return request('/positions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async update(id, payload) {
    return request(`/positions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async remove(id) {
    return request(`/positions/${id}`, { method: 'DELETE' });
  },
};
