/**
 * Role constants — single source of truth cho phân quyền frontend.
 * Phải đồng bộ với backend enum `UserRole` trong `backend/src/common/enums/business-values.ts`.
 *
 * CẬP NHẬT 2026-07-22: đã gỡ HR_LEAD (không tồn tại trong backend) — dùng DEPT_LEAD thay thế.
 */

export const ROLES = Object.freeze({
  ADMIN: 'ADMIN',
  DIRECTOR: 'DIRECTOR',
  CHAIRMAN: 'CHAIRMAN',
  DEPT_LEAD: 'DEPT_LEAD',
  EMPLOYEE: 'EMPLOYEE',
});

export const TAB_KEYS = Object.freeze({
  DASHBOARD: 'DASHBOARD',
  EMPLOYEES: 'EMPLOYEES',
  PROJECTS: 'PROJECTS',
  TIMESHEETS: 'TIMESHEETS',
  APPROVALS: 'APPROVALS',
  PAYROLL: 'PAYROLL',
  CONFIG: 'CONFIG',
  AUDIT_LOGS: 'AUDIT_LOGS',
  LEAVE: 'LEAVE',
  ONBOARDING: 'ONBOARDING',
  OFFBOARDING: 'OFFBOARDING',
  ATTENDANCE: 'ATTENDANCE',
});

/**
 * Menu permissions: role → danh sách tab được truy cập.
 * Phải khớp với backend `RolesGuard` ở controller tương ứng.
 */
export const ROLE_PERMISSIONS = Object.freeze({
  [ROLES.ADMIN]: [
    TAB_KEYS.DASHBOARD, TAB_KEYS.EMPLOYEES, TAB_KEYS.PROJECTS,
    TAB_KEYS.TIMESHEETS, TAB_KEYS.APPROVALS, TAB_KEYS.PAYROLL,
    TAB_KEYS.CONFIG, TAB_KEYS.AUDIT_LOGS,
    TAB_KEYS.LEAVE, TAB_KEYS.ONBOARDING, TAB_KEYS.OFFBOARDING,
    TAB_KEYS.ATTENDANCE,
  ],
  [ROLES.DIRECTOR]: [
    TAB_KEYS.DASHBOARD, TAB_KEYS.PROJECTS, TAB_KEYS.APPROVALS, TAB_KEYS.PAYROLL,
    TAB_KEYS.LEAVE, TAB_KEYS.OFFBOARDING, TAB_KEYS.ATTENDANCE,
  ],
  [ROLES.CHAIRMAN]: [
    TAB_KEYS.DASHBOARD, TAB_KEYS.PROJECTS, TAB_KEYS.APPROVALS, TAB_KEYS.PAYROLL,
    TAB_KEYS.LEAVE, TAB_KEYS.OFFBOARDING, TAB_KEYS.ATTENDANCE,
  ],
  [ROLES.DEPT_LEAD]: [
    TAB_KEYS.DASHBOARD, TAB_KEYS.EMPLOYEES, TAB_KEYS.PROJECTS,
    TAB_KEYS.TIMESHEETS, TAB_KEYS.APPROVALS, TAB_KEYS.CONFIG,
    TAB_KEYS.LEAVE, TAB_KEYS.ONBOARDING, TAB_KEYS.ATTENDANCE,
  ],
  [ROLES.EMPLOYEE]: [
    TAB_KEYS.DASHBOARD, TAB_KEYS.PROJECTS, TAB_KEYS.TIMESHEETS,
    TAB_KEYS.LEAVE, TAB_KEYS.ATTENDANCE,
  ],
});

/**
 * Action-level permissions: cho từng action cụ thể (button, modal trigger).
 * Các role không trong list sẽ thấy UI ẩn hoặc disabled.
 */
export const ACTION_PERMISSIONS = Object.freeze({
  // Employee Directory
  EMPLOYEE_CREATE: [ROLES.ADMIN, ROLES.DEPT_LEAD],
  EMPLOYEE_EDIT: [ROLES.ADMIN, ROLES.DEPT_LEAD],
  EMPLOYEE_TRANSFER: [ROLES.ADMIN, ROLES.DEPT_LEAD],
  EMPLOYEE_SALARY_ADJUST: [ROLES.ADMIN, ROLES.DEPT_LEAD],
  EMPLOYEE_DISCIPLINE: [ROLES.ADMIN, ROLES.DEPT_LEAD],

  // Projects — chỉ ADMIN + DEPT_LEAD được CRUD
  PROJECT_CREATE: [ROLES.ADMIN, ROLES.DEPT_LEAD],
  PROJECT_EDIT: [ROLES.ADMIN, ROLES.DEPT_LEAD],
  PROJECT_DELETE: [ROLES.ADMIN],
  TASK_CREATE: [ROLES.ADMIN, ROLES.DEPT_LEAD],
  TASK_EDIT: [ROLES.ADMIN, ROLES.DEPT_LEAD],
  TASK_DELETE: [ROLES.ADMIN],

  // Project Manager assignment — phải là leader cấp cao
  PROJECT_ASSIGN_PM: [ROLES.DEPT_LEAD, ROLES.DIRECTOR, ROLES.CHAIRMAN],

  // Payroll
  PAYROLL_CALCULATE: [ROLES.ADMIN, ROLES.DIRECTOR, ROLES.CHAIRMAN],

  // System config — work rates
  CONFIG_EDIT_WORK_RATE: [ROLES.ADMIN, ROLES.DEPT_LEAD],
  CONFIG_EDIT_APPROVAL_MATRIX: [ROLES.ADMIN],

  // Audit logs — chỉ ADMIN
  AUDIT_VIEW: [ROLES.ADMIN],
  AUDIT_VIEW_DETAIL: [ROLES.ADMIN],

  // User/role management (admin only)
  USER_MANAGE_ROLE: [ROLES.ADMIN],
  AUTH_RESET_PASSWORD_REQUEST: [ROLES.ADMIN, ROLES.DEPT_LEAD],
  AUTH_RESET_PASSWORD_APPROVE: [ROLES.ADMIN],

  // Dashboard quick actions
  DASHBOARD_QUICK_APPROVE: [ROLES.ADMIN, ROLES.DIRECTOR, ROLES.CHAIRMAN, ROLES.DEPT_LEAD],

  // Leave requests — admin/director/chairman/dept-lead xem tất cả
  LEAVE_VIEW_ALL: [ROLES.ADMIN, ROLES.DIRECTOR, ROLES.CHAIRMAN, ROLES.DEPT_LEAD],
});

/**
 * Helper: check role có trong action permission list không.
 */
export function canDo(userRole, actionKey) {
  if (!userRole || !actionKey) return false;
  const allowed = ACTION_PERMISSIONS[actionKey];
  if (!allowed) return false;
  return allowed.includes(userRole);
}

/**
 * Helper: check role có quyền truy cập tab không.
 */
export function canAccessTab(userRole, tabKey) {
  if (!userRole || !tabKey) return false;
  const allowed = ROLE_PERMISSIONS[userRole];
  if (!allowed) return false;
  return allowed.includes(tabKey);
}

/**
 * Helper: lấy tab đầu tiên user được truy cập.
 */
export function getFirstAllowedTab(userRole) {
  const allowed = ROLE_PERMISSIONS[userRole];
  return allowed ? allowed[0] : TAB_KEYS.DASHBOARD;
}
