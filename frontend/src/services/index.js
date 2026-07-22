import { authService } from './auth.service.js';
import { employeesService } from './employees.service.js';
import { timesheetsService } from './timesheets.service.js';
import { approvalsService } from './approvals.service.js';
import { auditLogsService } from './audit-logs.service.js';
import { payrollService } from './payroll.service.js';
import { configsService } from './configs.service.js';
import { projectsService } from './projects.service.js';
import { leaveService } from './leave-requests.service.js';
import { offboardingService } from './offboarding.service.js';
import { onboardingService } from './onboarding.service.js';
import { notificationsService } from './notifications.service.js';
import { attendanceService } from './notifications.service.js';
import { departmentsService } from './notifications.service.js';
import { positionsService } from './notifications.service.js';

export {
  authService,
  employeesService,
  timesheetsService,
  approvalsService,
  auditLogsService,
  payrollService,
  configsService,
  projectsService,
  leaveService,
  offboardingService,
  onboardingService,
  notificationsService,
  attendanceService,
  departmentsService,
  positionsService,
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
  leave: leaveService,
  offboarding: offboardingService,
  onboarding: onboardingService,
  notifications: notificationsService,
  attendance: attendanceService,
  departments: departmentsService,
  positions: positionsService,
};
