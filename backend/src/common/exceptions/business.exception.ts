import { HttpException } from '@nestjs/common';
import type { BusinessErrorPayload } from '../enums/business-values';

/**
 * Custom Business Exception theo chuẩn 05_business_values.md mục 4.
 * Trả response format: { statusCode, errorCode, i18nKey, params, timestamp }
 *
 * Mapping 15 error codes từ tài liệu + bổ sung theo thực tế module:
 * - ERR_AUTH_001 (401) → error.auth.invalidCredentials
 * - ERR_AUTH_002 (403) → error.auth.accessDenied
 * - ERR_AUTH_003 (404) → error.auth.userNotFound
 * - ERR_EMP_001 (400) → error.employee.codeOrEmailExists
 * - ERR_EMP_002 (400) → error.employee.cannotTransferNoticePeriod
 * - ERR_LEAVE_001 (400) → error.leave.insufficientBalance
 * - ERR_LEAVE_002 (400) → error.leave.invalidDateRange
 * - ERR_LEAVE_003 (400) → error.leave.cannotCancel
 * - ERR_APPROVAL_001 (403) → error.approval.unauthorizedLevel
 * - ERR_APPROVAL_002 (400) → error.approval.alreadyRejected
 * - ERR_APPROVAL_003 (404) → error.approval.requestNotFound
 * - ERR_APPROVAL_004 (400) → error.approval.invalidRequestData
 * - ERR_TIMESHEET_001 (400) → error.timesheet.alreadyApproved
 * - ERR_TIMESHEET_003 (400) → error.timesheet.noEntriesToSubmit
 * - ERR_PAYROLL_001 (400) → error.payroll.alreadyFinalized
 * - ERR_ATT_001 (400) → error.attendance.outsideCheckInWindow
 * - ERR_ATT_002 (400) → error.attendance.outsideCheckOutWindow
 */

/** Bảng ánh xạ Error Code → i18nKey + HTTP Status */
export const BUSINESS_ERROR_MAP: Record<
  string,
  { statusCode: number; i18nKey: string }
> = {
  ERR_AUTH_001: { statusCode: 401, i18nKey: 'error.auth.invalidCredentials' },
  ERR_AUTH_002: { statusCode: 403, i18nKey: 'error.auth.accessDenied' },
  ERR_AUTH_003: { statusCode: 404, i18nKey: 'error.auth.userNotFound' },
  ERR_EMP_001: { statusCode: 400, i18nKey: 'error.employee.codeOrEmailExists' },
  ERR_EMP_002: {
    statusCode: 400,
    i18nKey: 'error.employee.cannotTransferNoticePeriod',
  },
  ERR_LEAVE_001: {
    statusCode: 400,
    i18nKey: 'error.leave.insufficientBalance',
  },
  ERR_LEAVE_002: { statusCode: 400, i18nKey: 'error.leave.invalidDateRange' },
  ERR_LEAVE_003: {
    statusCode: 400,
    i18nKey: 'error.leave.cannotCancel',
  },
  ERR_APPROVAL_001: {
    statusCode: 403,
    i18nKey: 'error.approval.unauthorizedLevel',
  },
  ERR_APPROVAL_002: {
    statusCode: 400,
    i18nKey: 'error.approval.alreadyRejected',
  },
  ERR_APPROVAL_003: {
    statusCode: 404,
    i18nKey: 'error.approval.requestNotFound',
  },
  ERR_APPROVAL_004: {
    statusCode: 400,
    i18nKey: 'error.approval.invalidRequestData',
  },
  ERR_TIMESHEET_001: {
    statusCode: 400,
    i18nKey: 'error.timesheet.alreadyApproved',
  },
  ERR_TIMESHEET_002: {
    statusCode: 404,
    i18nKey: 'error.timesheet.notFound',
  },
  ERR_TIMESHEET_003: {
    statusCode: 400,
    i18nKey: 'error.timesheet.noEntriesToSubmit',
  },
  ERR_PAYROLL_001: {
    statusCode: 400,
    i18nKey: 'error.payroll.alreadyFinalized',
  },
  ERR_ATT_001: {
    statusCode: 400,
    i18nKey: 'error.attendance.outsideCheckInWindow',
  },
  ERR_ATT_002: {
    statusCode: 400,
    i18nKey: 'error.attendance.outsideCheckOutWindow',
  },
  ERR_UNKNOWN: {
    statusCode: 404,
    i18nKey: 'error.common.notFound',
  },
};

export class BusinessException extends HttpException {
  public readonly errorCode: string;
  public readonly i18nKey: string;
  public readonly params?: Record<string, any>;

  constructor(errorCode: string, params?: Record<string, any>) {
    const mapping = BUSINESS_ERROR_MAP[errorCode];
    if (!mapping) {
      throw new Error(`Unknown business error code: ${errorCode}`);
    }

    const payload: BusinessErrorPayload = {
      statusCode: mapping.statusCode,
      errorCode,
      i18nKey: mapping.i18nKey,
      params,
      timestamp: new Date().toISOString(),
    };

    super(payload, mapping.statusCode);
    this.errorCode = errorCode;
    this.i18nKey = mapping.i18nKey;
    this.params = params;
  }
}
