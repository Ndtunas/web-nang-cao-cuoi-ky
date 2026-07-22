import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attendance } from '../../entities/attendance.entity.js';
import { Employee } from '../../entities/employee.entity.js';
import { AttendanceService } from './attendance.service.js';
import { ATTENDANCE_RULES } from './attendance.constants.js';

/**
 * Cron job: 23:59:30 daily — finalize all un-checked-out attendance records
 * of the previous day (today, since cron fires before midnight transitions in
 * most timezones) as if the user clocked out at 18:00.
 *
 * Cron format: `30 59 23 * * *` = second 30, minute 59, hour 23.
 */
@Injectable()
export class AttendanceCronService {
  private readonly logger = new Logger(AttendanceCronService.name);

  constructor(
    @InjectRepository(Attendance)
    private readonly attendanceRepository: Repository<Attendance>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    private readonly attendanceService: AttendanceService,
  ) {}

  @Cron('30 59 23 * * *', {
    name: 'attendanceAutoCheckout',
    timeZone: 'Asia/Ho_Chi_Minh',
  })
  async autoCheckoutToday(): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    const allEmployees = await this.employeeRepository.find();
    let count = 0;
    for (const emp of allEmployees) {
      const rec = await this.attendanceRepository.findOne({
        where: { employeeId: emp.id, workDate: today as any },
      });
      if (rec && rec.checkIn && !rec.checkOut) {
        await this.attendanceService.autoCheckoutIfMissing(emp.id, todayStr);
        count++;
      }
    }
    this.logger.log(
      `[cron 23:59:30] Auto-checkout applied for ${count} records on ${todayStr}`,
    );
  }

  /**
   * Lazy manual trigger — useful for test/admin endpoints.
   */
  async runAutoCheckoutForDate(dateStr: string): Promise<number> {
    const employees = await this.employeeRepository.find();
    let count = 0;
    for (const emp of employees) {
      const rec = await this.attendanceRepository.findOne({
        where: { employeeId: emp.id, workDate: dateStr as any },
      });
      if (rec && rec.checkIn && !rec.checkOut) {
        await this.attendanceService.autoCheckoutIfMissing(emp.id, dateStr);
        count++;
      }
    }
    return count;
  }
}

// Export constant for downstream
export { ATTENDANCE_RULES };