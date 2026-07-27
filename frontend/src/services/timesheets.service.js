import { request } from './http.js';

export const timesheetsService = {
  async getMyWeekly(weekNumber, year) {
    return request(`/timesheets/my-weekly?weekNumber=${weekNumber}&year=${year}`);
  },

  async saveEntries(entries) {
    return request('/timesheets/entries', {
      method: 'POST',
      body: JSON.stringify({ entries }),
    });
  },

  async submit(timesheetId) {
    return request(`/timesheets/${timesheetId}/submit`, {
      method: 'POST',
    });
  },
};
