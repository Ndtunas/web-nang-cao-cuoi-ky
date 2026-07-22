const BASE_URL = '/api/v1';

// Helper to get headers with JWT token
function getHeaders() {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// Global fetch wrapper with automatic parsing and token check
async function request(url, options = {}) {
  const headers = getHeaders();
  const config = {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(`${BASE_URL}${url}`, config);
    
    let result = {};
    try {
      result = await response.json();
    } catch (e) {
      // ignore json parse errors
    }

    // Handle unauthorized (expired token, etc.)
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Redirect to login or reload page (skip for login attempts)
      if (!url.includes('/auth/login') && window.location.pathname !== '/login') {
        window.location.reload();
      }
    }

    if (!response.ok) {
      // Return custom backend error format
      throw {
        statusCode: response.status,
        errorCode: result.errorCode || 'ERR_UNKNOWN',
        i18nKey: result.i18nKey || 'error.unknown',
        message: result.message || 'Request failed',
      };
    }
    
    // Check if wrapped in standard response interceptor { success: true, data: ... }
    return result.data !== undefined ? result.data : result;
  } catch (error) {
    if (error.statusCode) throw error; // Re-throw structured API errors
    console.error('API Request Error:', error);
    throw {
      statusCode: 500,
      errorCode: 'ERR_CONNECTION',
      i18nKey: 'error.connection',
      message: 'Failed to connect to backend api.',
    };
  }
}

export const api = {
  auth: {
    async login(username, password) {
      const data = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      if (data && data.accessToken) {
        localStorage.setItem('token', data.accessToken);
        if (data.refreshToken) {
          localStorage.setItem('refreshToken', data.refreshToken);
        }
        localStorage.setItem('user', JSON.stringify(data.user));
      }
      return data;
    },
    async getProfile() {
      return request('/auth/profile');
    },
    async logout() {
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        await request('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        });
      } catch (e) {
        console.warn('Logout request failed:', e);
      } finally {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
      }
    }
  },

  employees: {
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
    }
  },

  configs: {
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
    }
  },

  timesheets: {
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
    }
  },

  approvals: {
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
    }
  },

  auditLogs: {
    async getAll(filters = {}) {
      const queryParams = new URLSearchParams(filters).toString();
      return request(`/audit-logs?${queryParams}`);
    },
    async getDiff(id) {
      return request(`/audit-logs/${id}/diff`);
    }
  },

  payroll: {
    async calculate(month, year) {
      return request('/payroll/calculate-monthly', {
        method: 'POST',
        body: JSON.stringify({ month, year }),
      });
    },
    async getSalaries(month, year) {
      return request(`/payroll/salaries?month=${month}&year=${year}`);
    }
  }
};
