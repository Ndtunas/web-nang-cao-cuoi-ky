/**
 * Exports service — gọi các endpoint /exports/* trả về file Excel,
 * sau đó trigger download blob cho browser.
 */

const BASE_URL = '/api/v1';

function getToken() {
  return localStorage.getItem('token') || '';
}

async function downloadFile(path, fallbackName) {
  const resp = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!resp.ok) {
    throw new Error(`Export failed: HTTP ${resp.status}`);
  }
  const blob = await resp.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;

  // Lấy filename từ header Content-Disposition nếu có
  const dispo = resp.headers.get('Content-Disposition') || '';
  const match = dispo.match(/filename="?([^"]+)"?/);
  a.download = match ? match[1] : fallbackName;

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export const exportsService = {
  exportEmployees() {
    return downloadFile('/exports/employees', 'employees.xlsx');
  },
  exportSalaries(month, year) {
    return downloadFile(
      `/exports/salaries?month=${month}&year=${year}`,
      `salaries-${month}-${year}.xlsx`,
    );
  },
  exportOtSummary(month, year) {
    return downloadFile(
      `/exports/ot-summary?month=${month}&year=${year}`,
      `ot-summary-${month}-${year}.xlsx`,
    );
  },
  exportLeaveRequests(month, year) {
    return downloadFile(
      `/exports/leave-requests?month=${month}&year=${year}`,
      `leave-requests-${month}-${year}.xlsx`,
    );
  },
};