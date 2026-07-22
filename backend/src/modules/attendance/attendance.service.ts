import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository, DataSource } from 'typeorm';
import { Attendance } from '../../entities/attendance.entity.js';
import { Employee } from '../../entities/employee.entity.js';
import { BusinessException } from '../../common/exceptions/business.exception.js';
import {
  ATTENDANCE_RULES,
  evaluateAbsenceStatus,
  evaluateCheckInStatus,
  evaluateCheckOut,
  toSec,
  fromSec,
} from './attendance.constants.js';

/**
 * Attendance rules engine — see attendance.constants.ts
 *
 * Endpoints:
 *  POST /attendance/check-in
 *  POST /attendance/check-out
 *
 *  Window summary (server-local times):
 *    Check-in  [07:30, 08:30] = PRESENT
 *               (08:30, 23:59] = LATE
 *               absent before 12:30 = INCOMPLETE (still possible)
 *               absent (12:30, 13:30] = HALF_DAY
 *               absent > 13:30 = ABSENT
 *    Check-out (00:00, 15:30) = HALF_DAY (early-out, allowed with warning)
 *               [15:30, 19:00] = PRESENT
 *               (19:00, ∞) = OVERTIME (OT = hours beyond 18:00)
 *
 *  Auto-finalize: cron job at 23:59:30 closes the day as 18:00 checkout
 *  if user never checked out.
 */
@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    @InjectRepository(Attendance)
    private readonly attendanceRepository: Repository<Attendance>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Check-in: tạo/cập nhật record cho hôm nay.
   * Trả về record + trạng thái tính toán theo rule mới.
   */
  async checkIn(userId: string): Promise<Attendance> {
    const employee = await this.employeeRepository.findOne({
      where: { userId },
    });
    if (!employee) throw new BusinessException('ERR_AUTH_003');

    const today = this.toDateOnly(new Date());
    const existing = await this.attendanceRepository.findOne({
      where: { employeeId: employee.id, workDate: today as any },
    });
    if (existing && existing.checkIn) {
      throw new BusinessException('ERR_EMP_001');
    }

    const now = this.nowTimeString();
    const nowSec = toSec(now);

    // Ngoài giờ chấm công: check-in chỉ cho phép từ 07:30 đến 23:59
    if (nowSec < toSec(ATTENDANCE_RULES.CHECKIN_START)) {
      throw new BusinessException('ERR_ATT_001', {
        earliest: ATTENDANCE_RULES.CHECKIN_START,
      });
    }

    const status = evaluateCheckInStatus(nowSec);

    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Attendance);
      let record: Attendance;
      if (existing) {
        existing.checkIn = now;
        existing.status = status;
        existing.workHours = 0;
        (existing as any).checkOut = null;
        record = await repo.save(existing);
      } else {
        const created = repo.create({
          employeeId: employee.id,
          workDate: today as any,
          checkIn: now,
          checkOut: null,
          workHours: 0,
          status,
        } as any as DeepPartial<Attendance>);
        record = await repo.save(created);
      }
      this.logger.log(`Check-in emp#${employee.id} ${now} (${status})`);
      return record;
    });
  }

  /**
   * Check-out: cập nhật giờ ra + tính work_hours/ot_hours theo rule.
   * Nếu checkout quá sớm (< 15:30) vẫn cho phép nhưng status = HALF_DAY.
   */
  async checkOut(userId: string): Promise<Attendance> {
    const employee = await this.employeeRepository.findOne({
      where: { userId },
    });
    if (!employee) throw new BusinessException('ERR_AUTH_003');

    const today = this.toDateOnly(new Date());
    const existing = await this.attendanceRepository.findOne({
      where: { employeeId: employee.id, workDate: today as any },
    });
    if (!existing || !existing.checkIn) {
      throw new BusinessException('ERR_EMP_002');
    }

    const now = this.nowTimeString();
    const nowSec = toSec(now);

    // Ngoài giờ chấm công: check-out không cho phép sau 23:59
    // (cron 23:59:30 sẽ tự động chốt = 18:00 nếu quên)
    if (nowSec > toSec(ATTENDANCE_RULES.CHECKOUT_LATEST)) {
      throw new BusinessException('ERR_ATT_002', {
        latest: ATTENDANCE_RULES.CHECKOUT_LATEST,
      });
    }

    const result = evaluateCheckOut(existing.checkIn, now);

    existing.checkOut = now;
    existing.workHours = result.workHours;
    existing.status = result.status;
    return this.attendanceRepository.save(existing);
  }

  /**
   * Trạng thái chấm công hôm nay của user.
   * Nếu user CHƯA check-in, sẽ trả absence-status theo giờ hiện tại
   * (INCOMPLETE / HALF_DAY / ABSENT).
   */
  async getToday(userId: string): Promise<Attendance | null> {
    const employee = await this.employeeRepository.findOne({
      where: { userId },
    });
    if (!employee) return null;
    const today = this.toDateOnly(new Date());
    const record = await this.attendanceRepository.findOne({
      where: { employeeId: employee.id, workDate: today as any },
    });
    if (record?.checkIn) return record;
    return record;
  }

  /**
   * Evaluate current attendance status without inserting — used by /today when
   * user has not yet checked in, so the UI can show "still NORMAL so far".
   */
  async evaluateTodayAbsence(userId: string): Promise<{
    status: 'INCOMPLETE' | 'HALF_DAY' | 'ABSENT' | 'PRESENT' | 'LATE';
    checkedIn: boolean;
  }> {
    const employee = await this.employeeRepository.findOne({
      where: { userId },
    });
    if (!employee) throw new BusinessException('ERR_AUTH_003');
    const today = this.toDateOnly(new Date());
    const record = await this.attendanceRepository.findOne({
      where: { employeeId: employee.id, workDate: today as any },
    });
    if (record?.checkIn) {
      return { status: record.status as any, checkedIn: true };
    }
    const absenceStatus = evaluateAbsenceStatus(toSec(this.nowTimeString()));
    return { status: absenceStatus as any, checkedIn: false };
  }

  /**
   * Lịch sử chấm công cá nhân.
   */
  async getMyHistory(userId: string, limit = 30): Promise<Attendance[]> {
    const employee = await this.employeeRepository.findOne({
      where: { userId },
    });
    if (!employee) return [];
    return this.attendanceRepository.find({
      where: { employeeId: employee.id },
      order: { workDate: 'DESC' },
      take: limit,
    });
  }

  /**
   * Admin/Lead xem tất cả attendance (gate ở controller).
   */
  async getAll(dateFrom?: string, dateTo?: string): Promise<Attendance[]> {
    const qb = this.attendanceRepository
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.employee', 'employee')
      .orderBy('a.workDate', 'DESC');
    if (dateFrom) qb.andWhere('a.work_date >= :df', { df: dateFrom });
    if (dateTo) qb.andWhere('a.work_date <= :dt', { dt: dateTo });
    return qb.getMany();
  }

  /**
   * Monthly summary for the current employee.
   */
  async statsMonth(userId: string, month: number, year: number): Promise<{
    present: number;
    late: number;
    halfDay: number;
    absent: number;
    overtime: number;
    total: number;
    workHoursSum: number;
    otHoursSum: number;
  }> {
    const employee = await this.employeeRepository.findOne({
      where: { userId },
    });
    if (!employee) throw new BusinessException('ERR_AUTH_003');
    const records = await this.attendanceRepository
      .createQueryBuilder('a')
      .where('a.employee_id = :emp', { emp: employee.id })
      .andWhere('EXTRACT(MONTH FROM a.work_date) = :m', { m: month })
      .andWhere('EXTRACT(YEAR FROM a.work_date) = :y', { y: year })
      .getMany();
    const stats = {
      present: records.filter((r) => r.status === 'PRESENT').length,
      late: records.filter((r) => r.status === 'LATE').length,
      halfDay: records.filter((r) => r.status === 'HALF_DAY').length,
      absent: records.filter((r) => r.status === 'ABSENT').length,
      overtime: records.filter((r) => r.status === 'OVERTIME').length,
      total: records.length,
      workHoursSum: records.reduce((s, r) => s + Number(r.workHours || 0), 0),
      otHoursSum: 0,
    };
    stats.otHoursSum = records.reduce((s, r) => {
      // recompute OT from clock times if explicit column is missing
      if (!r.checkIn || !r.checkOut) return s;
      const { otHours } = evaluateCheckOut(r.checkIn, r.checkOut);
      return s + otHours;
    }, 0);
    return stats;
  }

  /**
   * Auto-finalize a single day's attendance at 18:00 if the user never checked out.
   * Called by the cron job (23:59:30) AND when we apply backfill from timesheets.
   */
  async autoCheckoutIfMissing(
    employeeId: string,
    workDate: string,
  ): Promise<Attendance | null> {
    const record = await this.attendanceRepository.findOne({
      where: { employeeId, workDate: workDate as any },
    });
    if (!record || !record.checkIn || record.checkOut) return record ?? null;
    const fallback = ATTENDANCE_RULES.CHECKOUT_NORMAL_END;
    const result = evaluateCheckOut(record.checkIn, fallback);
    record.checkOut = fallback;
    record.workHours = result.workHours;
    record.status = result.status;
    return this.attendanceRepository.save(record);
  }

  /**
   * Used by reconciliation — fetch attendances for an employee in a week range.
   */
  async listForEmployeeInRange(
    employeeId: string,
    dateFrom: string,
    dateTo: string,
  ): Promise<Attendance[]> {
    return this.attendanceRepository
      .createQueryBuilder('a')
      .where('a.employee_id = :emp', { emp: employeeId })
      .andWhere('a.work_date >= :df', { df: dateFrom })
      .andWhere('a.work_date <= :dt', { dt: dateTo })
      .orderBy('a.work_date', 'ASC')
      .getMany();
  }

  // ─── helpers ───

  private toDateOnly(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private nowTimeString(): string {
    const d = new Date();
    return (
      String(d.getHours()).padStart(2, '0') +
      ':' +
      String(d.getMinutes()).padStart(2, '0') +
      ':' +
      String(d.getSeconds()).padStart(2, '0')
    );
  }
}

// Re-export for downstream consumers
export { ATTENDANCE_RULES, fromSec, toSec };
