import { authService } from './auth.service.js';
import { employeesService } from './employees.service.js';
import { timesheetsService } from './timesheets.service.js';
import { approvalsService } from './approvals.service.js';
import { auditLogsService } from './audit-logs.service.js';
import { payrollService } from './payroll.service.js';
import { configsService } from './configs.service.js';
import { projectsService } from './projects.service.js';

export {
  authService,
  employeesService,
  timesheetsService,
  approvalsService,
  auditLogsService,
  payrollService,
  configsService,
  projectsService,
};

/**
 * Aggregated `api` object — matches the legacy shape used in App.jsx, etc.
 * (`api.auth.login(...)`, `api.timesheets.saveEntries(...)`).
 * Prefer importing the individual `xxxService` named exports directly
 * in new code for better tree-shaking.
 */
export const api = {
  auth: authService,
  employees: employeesService,
  timesheets: timesheetsService,
  approvals: approvalsService,
  auditLogs: auditLogsService,
  payroll: payrollService,
  configs: configsService,
  projects: projectsService,
};
