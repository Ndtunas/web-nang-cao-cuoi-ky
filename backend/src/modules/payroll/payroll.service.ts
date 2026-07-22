import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Salary } from '../../entities/salary.entity.js';
import { Employee } from '../../entities/employee.entity.js';
import { WorkRateConfig } from '../../entities/work-rate-config.entity.js';
import { Timesheet } from '../../entities/timesheet.entity.js';
import { TimesheetEntry } from '../../entities/timesheet-entry.entity.js';
import { BusinessException } from '../../common/exceptions/business.exception.js';

@Injectable()
export class PayrollService {
  constructor(
    @InjectRepository(Salary)
    private readonly salaryRepository: Repository<Salary>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(WorkRateConfig)
    private readonly workRateConfigRepository: Repository<WorkRateConfig>,
    @InjectRepository(Timesheet)
    private readonly timesheetRepository: Repository<Timesheet>,
    @InjectRepository(TimesheetEntry)
    private readonly timesheetEntryRepository: Repository<TimesheetEntry>,
  ) {}

  async getSalaries(month: number, year: number): Promise<Salary[]> {
    return this.salaryRepository.find({
      where: { month, year },
      relations: {
        employee: {
          department: true,
          position: true,
        },
      },
      order: { netSalary: 'DESC' },
    });
  }

  /**
   * US-26: Lấy phiếu lương cá nhân. Lookup Salary theo userId -> employeeId -> Salary.
   */
  async getMyPayslip(
    userId: string,
    month: number,
    year: number,
  ): Promise<Salary | null> {
    const employee = await this.employeeRepository.findOne({
      where: { userId },
      relations: { department: true, position: true },
    });
    if (!employee) return null;
    return this.salaryRepository.findOne({
      where: { employeeId: employee.id, month, year },
      relations: {
        employee: {
          department: true,
          position: true,
        },
      },
    });
  }

  /**
   * US-25: Chốt bảng lương tháng → set tất cả Salary trong tháng/năm đó từ DRAFT → APPROVED.
   * Lưu ý: trong ngữ cảnh dự án này controller được gate ADMIN/DIRECTOR/CHAIRMAN.
   * Nếu muốn enforce multi-level theo spec (HR Lead → Director) thì bọc thêm ApprovalRequest,
   * nhưng US-25 đang describe thao tác cuối cùng nên đây là finalization endpoint.
   */
  async approveMonthly(dto: {
    month: number;
    year: number;
    comment?: string;
  }): Promise<{ updated: number; salaries: Salary[] }> {
    const { month, year } = dto;
    const result = await this.salaryRepository
      .createQueryBuilder()
      .update()
      .set({ status: 'APPROVED' })
      .where('month = :month AND year = :year AND status = :status', {
        month,
        year,
        status: 'DRAFT',
      })
      .execute();
    const salaries = await this.getSalaries(month, year);
    return {
      updated: result.affected ?? 0,
      salaries,
    };
  }

  async calculateMonthly(dto: {
    month: number;
    year: number;
  }): Promise<Salary[]> {
    const { month, year } = dto;
    const employees = await this.employeeRepository.find({
      relations: { position: true },
    });

    const configs = await this.workRateConfigRepository.find();
    const configMap = new Map(
      configs.map((c) => [c.configKey, Number(c.valueMultiplier)]),
    );

    const standardWorkDays = configMap.get('STANDARD_WORK_DAYS_MONTH') || 22.0;
    const otRateWeekday = configMap.get('OT_RATE_WEEKDAY') || 1.5;
    const otRateWeekend = configMap.get('OT_RATE_WEEKEND') || 2.0;
    const otRateHoliday = configMap.get('OT_RATE_HOLIDAY') || 3.0;

    const results: Salary[] = [];

    for (const emp of employees) {
      // Rule: Check if already finalized (ERR_PAYROLL_001)
      const existing = await this.salaryRepository.findOne({
        where: { employeeId: emp.id, month, year },
      });
      if (existing && existing.status !== 'DRAFT') {
        throw new BusinessException('ERR_PAYROLL_001');
      }

      // Base salary calculation
      const baseSalaryRatio = emp.position
        ? Number(emp.position.baseSalaryRatio)
        : 1.0;
      const baseSalary = 15000000 * baseSalaryRatio;

      // Query timesheets for employee in this month/year
      const timesheets = await this.timesheetRepository.find({
        where: { employeeId: emp.id, year },
      });

      // Filter timesheets whose start_date or end_date belongs to this month
      const monthTimesheets = timesheets.filter((t) => {
        const start = new Date(t.startDate);
        return start.getMonth() + 1 === month;
      });

      let totalNormalHours = 0;
      let otNormalHours = 0;
      let otWeekendHours = 0;
      let otHolidayHours = 0;

      for (const t of monthTimesheets) {
        // Query entries
        const entries = await this.timesheetEntryRepository.find({
          where: { timesheetId: t.id },
        });
        for (const entry of entries) {
          const hours = Number(entry.hoursSpent);
          if (entry.workType === 'NORMAL') {
            totalNormalHours += hours;
          } else if (entry.workType === 'OT_WEEKDAY') {
            otNormalHours += hours;
          } else if (entry.workType === 'OT_WEEKEND') {
            otWeekendHours += hours;
          } else if (entry.workType === 'OT_HOLIDAY') {
            otHolidayHours += hours;
          } else if (entry.workType === 'NIGHT_SHIFT') {
            totalNormalHours += hours; // Night shift adds to work hours, wait, can be simple normal
          }
        }
      }

      const workDays = totalNormalHours / 8.0;

      // Calculate hourly rate
      const hourlyRate = baseSalary / (standardWorkDays * 8.0);
      const otPay =
        otNormalHours * hourlyRate * otRateWeekday +
        otWeekendHours * hourlyRate * otRateWeekend +
        otHolidayHours * hourlyRate * otRateHoliday;

      const allowance = 1500000; // Standard food/transport allowance
      const deduction = 500000; // Standard social insurance deduction

      const netSalary = Math.max(
        0,
        baseSalary * (workDays / standardWorkDays) +
          otPay +
          allowance -
          deduction,
      );

      const payrollCode = `PAY-${emp.id}-${month}-${year}`;

      let salary = existing;
      if (!salary) {
        salary = this.salaryRepository.create({
          payrollCode,
          employeeId: emp.id,
          month,
          year,
          baseSalary,
          workDays,
          otNormalHours,
          otWeekendHours,
          otHolidayHours,
          otPayAmount: otPay,
          allowance,
          deduction,
          netSalary,
          status: 'DRAFT',
        });
      } else {
        salary.baseSalary = baseSalary;
        salary.workDays = workDays;
        salary.otNormalHours = otNormalHours;
        salary.otWeekendHours = otWeekendHours;
        salary.otHolidayHours = otHolidayHours;
        salary.otPayAmount = otPay;
        salary.netSalary = netSalary;
      }

      const saved = await this.salaryRepository.save(salary);
      results.push(saved);
    }

    return this.getSalaries(month, year);
  }
}
