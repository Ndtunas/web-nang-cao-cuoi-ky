/**
 * BUSINESS VALUES & ENUMS SPECIFICATION
 * Strict Type definitions matching business/05_business_values.md
 */

export enum UserRole {
  ADMIN = 'ADMIN',           // Quản trị hệ thống
  CHAIRMAN = 'CHAIRMAN',     // Level 4: Chủ tịch
  DIRECTOR = 'DIRECTOR',     // Level 3: Giám đốc
  DEPT_LEAD = 'DEPT_LEAD',   // Level 2: Trưởng phòng / HR Lead / PM
  EMPLOYEE = 'EMPLOYEE'      // Level 1: Thành viên / Nhân viên
}

export enum EmployeeStatus {
  ONBOARDING = 'ONBOARDING',       // Đang thực hiện thủ tục tiếp nhận
  PROBATION = 'PROBATION',         // Đang trong thời gian thử việc
  OFFICIAL = 'OFFICIAL',           // Nhân viên chính thức
  SUSPENDED = 'SUSPENDED',         // Tạm hoãn HĐLĐ
  NOTICE_PERIOD = 'NOTICE_PERIOD', // Thời gian báo trước nghỉ việc
  TERMINATED = 'TERMINATED'        // Đã thanh lý HĐLĐ (Thôi việc)
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER'
}

export enum ContractType {
  PROBATION = 'PROBATION',
  FIXED_TERM_1Y = 'FIXED_TERM_1Y',
  FIXED_TERM_3Y = 'FIXED_TERM_3Y',
  INDEFINITE = 'INDEFINITE'
}

export enum LeaveType {
  ANNUAL_LEAVE = 'ANNUAL_LEAVE',
  SICK_LEAVE = 'SICK_LEAVE',
  MATERNITY_LEAVE = 'MATERNITY_LEAVE',
  UNPAID_LEAVE = 'UNPAID_LEAVE',
  COMPASSIONATE_LEAVE = 'COMPASSIONATE_LEAVE'
}

export enum WorkType {
  NORMAL = 'NORMAL',           // Giờ làm việc tiêu chuẩn (Hành chính)
  OT_WEEKDAY = 'OT_WEEKDAY',   // Làm thêm giờ ngày thường
  OT_WEEKEND = 'OT_WEEKEND',   // Làm thêm giờ Thứ 7 / Chủ nhật
  OT_HOLIDAY = 'OT_HOLIDAY',   // Làm thêm giờ ngày nghỉ Lễ/Tết
  NIGHT_SHIFT = 'NIGHT_SHIFT'  // Làm việc ca đêm 22h-06h (+30%)
}

export enum TransactionType {
  LEAVE_SHORT = 'LEAVE_SHORT',                   // Đơn nghỉ phép ngắn ngày (<= 2 ngày - 1 Cấp)
  LEAVE_LONG = 'LEAVE_LONG',                     // Đơn nghỉ phép dài ngày (> 2 ngày - 2 Cấp)
  TIMESHEET = 'TIMESHEET',                       // Khai báo Timesheet tuần (2 Cấp)
  PERSONAL_INFO_CHANGE = 'PERSONAL_INFO_CHANGE', // Thay đổi thông tin cá nhân Group A (1 Cấp)
  JOB_TRANSFER = 'JOB_TRANSFER',                 // Điều chuyển công tác Group B (2 Cấp)
  SALARY_ADJUSTMENT = 'SALARY_ADJUSTMENT',       // Tăng lương & Phụ cấp Group C (3 Cấp)
  DISCIPLINE_REWARD = 'DISCIPLINE_REWARD',       // Khen thưởng / Kỷ luật Group D (3 Cấp)
  OFFBOARDING = 'OFFBOARDING',                   // Thôi việc & Offboarding (3 Cấp)
  PAYROLL_MONTHLY = 'PAYROLL_MONTHLY'            // Chốt Bảng lương tháng (2 Cấp)
}

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED'
}

export enum PayrollStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  PAID = 'PAID'
}

export enum SystemActionType {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  EXPORT = 'EXPORT'
}

export interface BusinessErrorPayload {
  statusCode: number;
  errorCode: string;
  i18nKey: string;
  params?: Record<string, any>;
  timestamp: string;
}
