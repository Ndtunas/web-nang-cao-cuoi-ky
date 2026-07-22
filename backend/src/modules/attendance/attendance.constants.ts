/**
 * Attendance rule constants — Backed by business rule
 * (ref: yêu cầu "quy tắc đối soát timesheet" 22-07-2026)
 *
 * All thresholds expressed as HH:MM:SS strings for direct compare.
 * Work-time windows are also aware of work-hours logic.
 */
export const ATTENDANCE_RULES = {
  /** Check-in window (HH:MM:SS, server local TZ). */
  CHECKIN_START: '07:30:00',
  CHECKIN_DEADLINE: '08:30:00',
  /** After 12:30 if no check-in yet → HALF_DAY absent. */
  CHECKIN_HALFDAY_CUTOFF: '12:30:00',
  /** After 13:30 if no check-in yet → ABSENT (full day off). */
  CHECKIN_ABSENT_CUTOFF: '13:30:00',

  /** Check-out window. */
  CHECKOUT_EARLIEST: '15:30:00',
  CHECKOUT_NORMAL_END: '18:00:00',
  /** Check-out before 15:30 → HALF_DAY; from 15:30 to 18:00 = PRESENT. */
  CHECKOUT_LATEST_REASONABLE: '19:00:00',
  /** After 19:00 → OT (only the part after 18:00 counts as OT). */
  /** Latest allowed manual check-out time. After 23:59:00 the API rejects
   *  (cron at 23:59:30 will finalize the day as 18:00). */
  CHECKOUT_LATEST: '23:59:00',

  /** Cron job time to auto-finalize no-checkout day as 18:00. */
  AUTO_CHECKOUT_TIME: '23:59:30',

  /** Standard full-day work hours. */
  FULL_DAY_HOURS: 8,
  /** Standard half-day work hours. */
  HALF_DAY_HOURS: 4,
  /** Lunch break subtraction (already in computeWorkHours). */
  LUNCH_BREAK_HOURS: 1,
} as const;

/**
 * Compute attendance status from check-in / check-out pair.
 * Applies the rule matrix from business spec:
 *  | window              | status    |
 *  | ------------------- | --------- |
 *  | in [7:30, 8:30]     | PRESENT   |
 *  | in (8:30, 12:30)    | LATE      |
 *  | (12:30, 13:30)      | HALF_DAY  | (no check-in yet)
 *  | > 13:30             | ABSENT    | (no check-in yet)
 *
 * For check-out side (relative to a check-in):
 *  | check-out window    | work_hours | status / note        |
 *  | < 15:30             | partial    | HALF_DAY             |
 *  | [15:30, 18:00]      | std        | PRESENT              |
 *  | (18:00, 19:00]      | std        | PRESENT  + OT pending|
 *  | > 19:00             | std + OT   | OVERTIME            |
 *
 * All times are local server-side HH:MM:SS strings.
 */
export type AttendanceStatus =
  | 'PRESENT'
  | 'LATE'
  | 'HALF_DAY'
  | 'ABSENT'
  | 'OVERTIME'
  | 'INCOMPLETE';

export interface ComputeStatusInput {
  checkIn: string | null;
  checkOut: string | null;
  /** Time of evaluation, e.g. when getToday() runs. */
  now: string;
  /** Boolean: if true, treat missing check-in as ABSENT/HALF_DAY per current time. */
  applyAbsenceRules: boolean;
}

export interface ComputeStatusResult {
  status: AttendanceStatus;
  workHours: number;
  /** OT hours (work_hours already includes 8 standard; this is the extra part). */
  otHours: number;
}

/** Parse HH:MM:SS → seconds-of-day. */
export function toSec(t: string): number {
  const [h, m, s] = t.split(':').map(Number);
  return h * 3600 + m * 60 + (s || 0);
}

/** Format seconds-of-day → HH:MM:SS. */
export function fromSec(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Returns check-in status after a check-in event.
 *
 * Rules:
 *  - in [CHECKIN_START, CHECKIN_DEADLINE] → PRESENT
 *  - in (CHECKIN_DEADLINE, 23:59:59] → LATE
 *  - < CHECKIN_START → PRESENT (early arrival is fine)
 */
export function evaluateCheckInStatus(
  checkInSec: number,
): 'PRESENT' | 'LATE' {
  const deadline = toSec(ATTENDANCE_RULES.CHECKIN_DEADLINE);
  return checkInSec <= deadline ? 'PRESENT' : 'LATE';
}

/**
 * Returns whether the day should be marked ABSENT vs HALF_DAY
 * given current time and an absent (no check-in) day.
 *
 *  - now <= CHECKIN_HALFDAY_CUTOFF  → still possible (INCOMPLETE)
 *  - now in (HALFDAY_CUTOFF, ABSENT_CUTOFF] → HALF_DAY
 *  - now > ABSENT_CUTOFF → ABSENT
 */
export function evaluateAbsenceStatus(nowSec: number): AttendanceStatus {
  const halfCut = toSec(ATTENDANCE_RULES.CHECKIN_HALFDAY_CUTOFF);
  const absCut = toSec(ATTENDANCE_RULES.CHECKIN_ABSENT_CUTOFF);
  if (nowSec <= halfCut) return 'INCOMPLETE';
  if (nowSec <= absCut) return 'HALF_DAY';
  return 'ABSENT';
}

/**
 * Evaluate check-out event. Returns work_hours + status + OT hours.
 *
 * Note: lunch break is subtracted inside computeWorkHours.
 * If check-out < 15:30, work_hours = max(0, (out - in)/3600 - 1) but status=HALF_DAY.
 * If 15:30 ≤ out ≤ 19:00, work_hours standard ≤ FULL_DAY_HOURS, status=PRESENT.
 * If 19:00 < out (regardless of upper bound), OT portion = (out - 18:00).
 *   work_hours = full + OT, status = OVERTIME.
 *
 * If both checkIn and checkOut present:
 *   standard work = (out - in) hours - LUNCH_BREAK_HOURS, capped at FULL_DAY_HOURS.
 *   ot           = max(0, outSec - normalEnd) / 3600
 */
export function evaluateCheckOut(
  checkIn: string,
  checkOut: string,
): ComputeStatusResult {
  const inSec = toSec(checkIn);
  const outSec = toSec(checkOut);
  if (outSec <= inSec) {
    return { status: 'HALF_DAY', workHours: 0, otHours: 0 };
  }

  const earliest = toSec(ATTENDANCE_RULES.CHECKOUT_EARLIEST);
  const normalEnd = toSec(ATTENDANCE_RULES.CHECKOUT_NORMAL_END);
  const otStart = toSec(ATTENDANCE_RULES.CHECKOUT_LATEST_REASONABLE);

  const rawHours = (outSec - inSec) / 3600 - ATTENDANCE_RULES.LUNCH_BREAK_HOURS;
  const standard = Math.max(0, Math.min(rawHours, ATTENDANCE_RULES.FULL_DAY_HOURS));

  let status: AttendanceStatus;
  let otHours = 0;

  if (outSec < earliest) {
    // Early-out → HALF_DAY regardless of standard calculation
    status = 'HALF_DAY';
  } else if (outSec <= otStart) {
    // Within 15:30-19:00 window
    status = 'PRESENT';
  } else {
    // After 19:00 → OVERTIME
    status = 'OVERTIME';
    otHours = Math.max(0, (outSec - normalEnd) / 3600);
  }

  return {
    status,
    workHours: Math.round(standard * 100) / 100,
    otHours: Math.round(otHours * 100) / 100,
  };
}
