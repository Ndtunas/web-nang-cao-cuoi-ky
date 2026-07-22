/**
 * Validation Rules — theo 05_business_values.md mục 3.
 * 6 quy tắc xác thực dữ liệu chuẩn, dùng trong các DTOs.
 */

/** 1. Mã Nhân Viên: Pattern Mnemonic (VD: BaoLM, BaoLM2, NgocTTB) */
export const EMP_CODE_REGEX = /^[A-Za-z]+[0-9]*$/;

/** 2. Email Công Ty: Standard email regex */
export const COMPANY_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@company\.com$/;

/** 3. Mật Khẩu: Min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special char */
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
export const PASSWORD_MESSAGE =
  'Mật khẩu phải có ít nhất 8 ký tự, gồm 1 chữ hoa, 1 chữ thường, 1 chữ số và 1 ký tự đặc biệt (!@#$%^&*)';

/** 4. Số Điện Thoại: Format 0[3|5|7|8|9]xxxxxxxx (10 chữ số) */
export const PHONE_REGEX = /^(0[35789])[0-9]{8}$/;

/** 5. Số Giờ Khai Timesheet: Min 0.5, Max 24.0 */
export const HOURS_SPENT_MIN = 0.5;
export const HOURS_SPENT_MAX = 24.0;

/** 6. Mã Số Thuế: 10 hoặc 13 chữ số */
export const TAX_CODE_REGEX = /^([0-9]{10}|[0-9]{13})$/;
