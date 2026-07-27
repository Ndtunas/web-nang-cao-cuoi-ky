/**
 * Centralized helper để map business value (raw enum) sang i18n key.
 *
 * Quy ước:
 *   - Backend trả business value thẳng (vd: "NOTICE_PERIOD", "PENDING", "OT_WEEKDAY").
 *   - Frontend KHÔNG hiển thị raw value, mà lookup i18n key tương ứng.
 *   - Nếu key chưa có trong file i18n → fallback về raw value để không crash UI.
 *
 * Pattern sử dụng:
 *   <Tag>{labelFor(t, 'employeeStatus', 'NOTICE_PERIOD')}</Tag>
 *   <Select.Option value="ACTIVE">{labelFor(t, 'employeeStatus', 'ACTIVE')}</Select.Option>
 */

/**
 * Map giữa domain và i18n key prefix.
 * Mỗi entry:
 *   - prefix: path trong file i18n (vd: 'employee.statusLabels')
 *   - fallback: nhãn hiển thị nếu không có trong i18n (raw value)
 */
const LABEL_DOMAINS = Object.freeze({
  employeeStatus: {
    prefix: 'employeeTable.statusLabels',
  },
  projectStatus: {
    prefix: 'projects.statusLabels',
  },
  timesheetStatus: {
    prefix: 'timesheets.statusLabels',
  },
  attendanceStatus: {
    prefix: 'att.statusLabels',
  },
  leaveStatus: {
    prefix: 'leave.statusLabels',
  },
  leaveType: {
    prefix: 'leave.typeLabels',
  },
  approvalStatus: {
    prefix: 'approvals.statusLabels',
  },
  payrollStatus: {
    prefix: 'payroll.statusLabels',
  },
  workType: {
    prefix: 'timesheets.workTypeLabels',
  },
  onbOffbTaskStatus: {
    prefix: 'onbOffb.taskStatusLabels',
  },
  onboardingTaskDepartment: {
    prefix: 'onbOffb.taskDepartments',
  },
  disciplineType: {
    prefix: 'directory.modals.disciplineTypeLabels',
  },
});

/**
 * Tra cứu i18n key theo domain + business value.
 * Trả về label ngôn ngữ tự nhiên, hoặc raw value nếu key không tồn tại.
 *
 * @param {Function} t - i18n t function
 * @param {string} domain - một key trong LABEL_DOMAINS (vd: 'employeeStatus')
 * @param {string} value - business value từ backend (vd: 'NOTICE_PERIOD')
 * @returns {string}
 */
export function labelFor(t, domain, value) {
  if (!t || value === null || value === undefined) return value ?? '';
  const config = LABEL_DOMAINS[domain];
  if (!config) return value;
  return t(`${config.prefix}.${value}`, { defaultValue: value });
}

export const LABEL_DOMAINS_FOR_TYPING = LABEL_DOMAINS;
