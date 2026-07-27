import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PinoLogger } from 'nestjs-pino';
import { Timesheet } from '../../entities/timesheet.entity';
import { TimesheetEntry } from '../../entities/timesheet-entry.entity';
import { Employee } from '../../entities/employee.entity';
import { ApprovalRequest } from '../../entities/approval-request.entity';
import { Project } from '../../entities/project.entity';
import { ProjectTask } from '../../entities/project-task.entity';
import { Attendance } from '../../entities/attendance.entity';
import { WorkRateConfig } from '../../entities/work-rate-config.entity';
import { ApprovalService } from '../approval/approval.service';
import { AttendanceService } from '../attendance/attendance.service';
import { ATTENDANCE_RULES } from '../attendance/attendance.constants';
import { BusinessException } from '../../common/exceptions/business.exception';

interface DailyExpected {
  date: string;
  weekday: number; // 0=Sun..6=Sat
  expectedHours: number; // 0 if weekend
  attendanceStatus: string | null;
  workHours: number;
}

interface ReconciliationWarning {
  date: string;
  expected: number;
  declared: number;
  diff: number;
  severity: 'info' | 'warn' | 'error';
  message: string;
}

@Injectable()
export class TimesheetsService {
  constructor(
    private readonly logger: PinoLogger,
    @InjectRepository(Timesheet)
    private readonly timesheetRepository: Repository<Timesheet>,
    @InjectRepository(TimesheetEntry)
    private readonly timesheetEntryRepository: Repository<TimesheetEntry>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(ApprovalRequest)
    private readonly approvalRequestRepository: Repository<ApprovalRequest>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(ProjectTask)
    private readonly projectTaskRepository: Repository<ProjectTask>,
    @InjectRepository(Attendance)
    private readonly attendanceRepository: Repository<Attendance>,
    @InjectRepository(WorkRateConfig)
    private readonly workRateConfigRepository: Repository<WorkRateConfig>,
    private readonly approvalService: ApprovalService,
    private readonly attendanceService: AttendanceService,
  ) {}

  async getMyWeekly(
    userId: string,
    weekNumber: number,
    year: number,
  ): Promise<any> {
    const employee = await this.employeeRepository.findOne({
      where: { userId },
    });
    if (!employee) throw new BusinessException('ERR_AUTH_001');

    // Calculate start and end date of the week
    const janFirst = new Date(year, 0, 1);
    const dayOfWeek = janFirst.getDay();
    const offset = (weekNumber - 1) * 7 - (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
    const startDate = new Date(janFirst);
    startDate.setDate(janFirst.getDate() + offset);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);

    // Use upsert to avoid race condition - only insert if not exists
    const timesheetCode = `TS-${employee.empCode}-W${weekNumber.toString().padStart(2, '0')}-${year}`;

    await this.timesheetRepository
      .createQueryBuilder()
      .insert()
      .into(Timesheet)
      .values({
        employeeId: employee.id,
        weekNumber,
        year,
        startDate,
        endDate,
        totalNormalHours: 0,
        totalOtHours: 0,
        status: 'DRAFT',
        timesheetCode,
      })
      .orIgnore() // PostgreSQL: INSERT ... ON CONFLICT DO NOTHING
      .execute();

    // Fetch the timesheet (either newly created or existing)
    const timesheet = await this.timesheetRepository.findOne({
      where: { employeeId: employee.id, weekNumber, year },
    });

    const entries = await this.timesheetEntryRepository.find({
      where: { timesheetId: timesheet!.id },
      relations: { project: true, task: true },
    });

    const projects = await this.projectRepository.find({
      relations: { pm: true },
    });

    const tasks = await this.projectTaskRepository.find();

    // Reconciliation: compute expected hours per day from attendance records
    const dateFrom = startDate.toISOString().split('T')[0];
    const dateTo = endDate.toISOString().split('T')[0];
    const dailyExpected = await this.computeDailyExpected(
      employee.id,
      startDate,
      endDate,
    );

    // Pre-fill: if timesheet is empty (DRAFT) AND no attendance yet today,
    // suggest 8h × 5 weekdays (Mon-Fri) NORMAL.
    const isDraftEmpty =
      entries.length === 0 &&
      (timesheet!.status === 'DRAFT' || timesheet!.status === 'REJECTED');

    const suggestedEntries: any[] = [];
    if (isDraftEmpty) {
      const defaultProject = projects[0];
      const defaultTask = tasks[0];
      if (defaultProject && defaultTask) {
        // weekdays only (Mon-Fri)
        for (let i = 0; i < 5; i++) {
          const d = new Date(startDate);
          d.setDate(startDate.getDate() + i);
          const dateStr = d.toISOString().split('T')[0];
          suggestedEntries.push({
            rowId: `suggest-${dateStr}`,
            timesheetId: timesheet!.id,
            projectId: defaultProject.id,
            taskId: defaultTask.id,
            entryDate: dateStr,
            hoursSpent: ATTENDANCE_RULES.FULL_DAY_HOURS,
            workType: 'NORMAL',
            description: 'Auto-prefill (điều chỉnh nếu khác)',
          });
        }
      }
    }

    const reconciliation = this.diffDailyExpectedVsEntries(
      dailyExpected,
      entries,
    );

    return {
      timesheet,
      entries,
      projects,
      tasks,
      suggestedEntries, // populated when timesheet is empty
      reconciliation, // { dailyExpected, warnings, targetTotalHours }
    };
  }

  /**
   * Compute the expected (target) work hours per weekday from attendance records.
   * - Weekends (Sat/Sun) → 0
   * - PRESENT/LATE/OVERTIME → 8
   * - HALF_DAY → 4
   * - ABSENT/no record → 0 (still possible to khai báo nếu có off-day)
   */
  private async computeDailyExpected(
    employeeId: string,
    startDate: Date | string,
    endDate: Date | string,
  ): Promise<DailyExpected[]> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const records = await this.attendanceService.listForEmployeeInRange(
      employeeId,
      start.toISOString().split('T')[0],
      end.toISOString().split('T')[0],
    );
    const recMap = new Map<string, Attendance>();
    records.forEach((r) => {
      const wd = new Date(r.workDate as any);
      const dateStr = `${wd.getFullYear()}-${String(wd.getMonth() + 1).padStart(2, '0')}-${String(wd.getDate()).padStart(2, '0')}`;
      recMap.set(dateStr, r);
    });

    const out: DailyExpected[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const weekday = d.getDay(); // 0=Sun..6=Sat
      const rec = recMap.get(dateStr);
      let expected = 0;
      if (weekday !== 0 && weekday !== 6) {
        if (rec) {
          if (rec.status === 'HALF_DAY') expected = ATTENDANCE_RULES.HALF_DAY_HOURS;
          else if (rec.status === 'ABSENT') expected = 0;
          else expected = ATTENDANCE_RULES.FULL_DAY_HOURS;
        }
      }
      out.push({
        date: dateStr,
        weekday,
        expectedHours: expected,
        attendanceStatus: rec?.status ?? null,
        workHours: Number(rec?.workHours ?? 0),
      });
    }
    return out;
  }

  /**
   * Diff daily expected vs declared entries. Returns warnings list.
   * Tolerance: ±0.5h (rounding). > 0.5 → warn; > 2 → error.
   */
  private diffDailyExpectedVsEntries(
    expected: DailyExpected[],
    entries: TimesheetEntry[],
  ): {
    dailyExpected: DailyExpected[];
    warnings: ReconciliationWarning[];
    targetTotalHours: number;
    declaredTotalHours: number;
  } {
    const declared = new Map<string, number>();
    entries.forEach((e) => {
      const wd = new Date(e.entryDate as any);
      const dateStr = `${wd.getFullYear()}-${String(wd.getMonth() + 1).padStart(2, '0')}-${String(wd.getDate()).padStart(2, '0')}`;
      declared.set(dateStr, (declared.get(dateStr) ?? 0) + Number(e.hoursSpent || 0));
    });

    const warnings: ReconciliationWarning[] = [];
    let totalExpected = 0;
    let totalDeclared = 0;
    for (const day of expected) {
      const decl = declared.get(day.date) ?? 0;
      totalExpected += day.expectedHours;
      totalDeclared += decl;
      if (day.expectedHours === 0) continue; // skip weekends/absent
      const diff = Math.abs(decl - day.expectedHours);
      if (diff < 0.5) continue;
      let severity: ReconciliationWarning['severity'] = 'info';
      if (diff > 2) severity = 'error';
      else severity = 'warn';
      let msg = `Ngày ${day.date}: khai ${decl}h, dự kiến theo chấm công ${day.expectedHours}h`;
      if (decl < day.expectedHours) {
        msg += ` (thiếu ${(day.expectedHours - decl).toFixed(2)}h)`;
      } else {
        msg += ` (thừa ${(decl - day.expectedHours).toFixed(2)}h)`;
      }
      warnings.push({
        date: day.date,
        expected: day.expectedHours,
        declared: decl,
        diff: day.expectedHours - decl,
        severity,
        message: msg,
      });
    }

    return {
      dailyExpected: expected,
      warnings,
      targetTotalHours: totalExpected,
      declaredTotalHours: totalDeclared,
    };
  }

  async saveEntries(userId: string, dto: any): Promise<any> {
    try {
      const employee = await this.employeeRepository.findOne({
        where: { userId },
      });
      if (!employee) throw new BusinessException('ERR_TIMESHEET_002');

      const entriesCount = dto?.entries?.length ?? 0;
      this.logger.info(
        {
          userId,
          empCode: employee.empCode,
          entriesCount,
          timesheetId: dto.entries?.[0]?.timesheetId,
          action: 'saveEntries:start',
        },
        `Saving ${entriesCount} timesheet entries for user ${userId}`,
      );

      const firstEntry = dto.entries?.[0];
      if (!firstEntry) {
        this.logger.warn(
          { userId },
          'saveEntries called with empty entries array',
        );
        return { success: true };
      }

      const timesheet = await this.timesheetRepository.findOne({
        where: { id: firstEntry.timesheetId },
      });
      if (!timesheet) throw new BusinessException('ERR_UNKNOWN');

      // Rule: Cannot update if already approved or pending (ERR_TIMESHEET_001)
      if (timesheet.status !== 'DRAFT' && timesheet.status !== 'REJECTED') {
        this.logger.warn(
          {
            userId,
            timesheetId: timesheet.id,
            currentStatus: timesheet.status,
          },
          `Cannot update timesheet in status ${timesheet.status}`,
        );
        throw new BusinessException('ERR_TIMESHEET_001');
      }

      // Delete existing entries
      await this.timesheetEntryRepository.delete({ timesheetId: timesheet.id });

      // Save new entries and compute totals
      let totalNormal = 0;
      let totalOt = 0;

      // Nạp động hệ số từ WorkRateConfig theo spec 03_workflows.md §3
      const configs = await this.workRateConfigRepository.find();
      const configMap = new Map(
        configs.map((c) => [c.configKey, Number(c.valueMultiplier)]),
      );
      const rateMap: Record<string, number> = {
        OT_WEEKDAY: configMap.get('OT_RATE_WEEKDAY') ?? 1.5,
        OT_WEEKEND: configMap.get('OT_RATE_WEEKEND') ?? 2.0,
        OT_HOLIDAY: configMap.get('OT_RATE_HOLIDAY') ?? 3.0,
        NIGHT_SHIFT: configMap.get('NIGHT_SHIFT_BONUS') ?? 0.3,
      };

      for (const ent of dto.entries) {
        const rate = rateMap[ent.workType] ?? 1.0;

        const entry = this.timesheetEntryRepository.create({
          timesheetId: timesheet.id,
          projectId: ent.projectId,
          taskId: ent.taskId,
          entryDate: new Date(ent.entryDate),
          hoursSpent: parseFloat(ent.hoursSpent),
          workType: ent.workType,
          appliedRate: rate,
          description: ent.description,
        });
        await this.timesheetEntryRepository.save(entry);

        if (ent.workType === 'NORMAL') {
          totalNormal += parseFloat(ent.hoursSpent);
        } else {
          totalOt += parseFloat(ent.hoursSpent);
        }
      }

      timesheet.totalNormalHours = totalNormal;
      timesheet.totalOtHours = totalOt;
      await this.timesheetRepository.save(timesheet);

      const savedEntries = await this.timesheetEntryRepository.find({
        where: { timesheetId: timesheet.id },
        relations: { project: true, task: true },
      });

      this.logger.info(
        {
          userId,
          timesheetId: timesheet.id,
          totalNormal,
          totalOt,
          entriesSaved: savedEntries.length,
          action: 'saveEntries:success',
        },
        `Saved ${savedEntries.length} entries for timesheet ${timesheet.id}`,
      );

      // Reconciliation: so sánh tổng khai với tổng expected từ attendance.
      const dailyExpected = await this.computeDailyExpected(
        employee.id,
        timesheet.startDate,
        timesheet.endDate,
      );
      const reconciliation = this.diffDailyExpectedVsEntries(
        dailyExpected,
        savedEntries,
      );

      return {
        timesheet,
        entries: savedEntries,
        reconciliation,
      };
    } catch (e) {
      this.logger.error(
        {
          userId,
          err: {
            name: (e as Error).constructor?.name,
            message: (e as Error).message,
            stack: (e as Error).stack,
          },
          action: 'saveEntries:error',
        },
        `Failed to save entries: ${(e as Error).message}`,
      );
      throw e;
    }
  }

  async submit(id: string, userId: string): Promise<Timesheet> {
    const employee = await this.employeeRepository.findOne({
      where: { userId },
    });
    if (!employee) throw new BusinessException('ERR_TIMESHEET_002');

    const timesheet = await this.timesheetRepository.findOne({ where: { id } });
    if (!timesheet) throw new BusinessException('ERR_UNKNOWN');

    if (timesheet.status !== 'DRAFT' && timesheet.status !== 'REJECTED') {
      throw new BusinessException('ERR_TIMESHEET_001');
    }

    // Create Approval Request
    const approvalReq = this.approvalRequestRepository.create({
      transactionType: 'TIMESHEET',
      referenceEntityId: timesheet.id,
      requesterId: employee.id,
      currentLevel: 1,
      totalLevels: 2,
      status: 'PENDING',
    });
    const savedReq = await this.approvalRequestRepository.save(approvalReq);

    // Update Timesheet
    timesheet.status = 'PENDING_APPROVAL';
    timesheet.approvalRequestId = savedReq.id;
    return this.timesheetRepository.save(timesheet);
  }

  /**
   * Xóa 1 dòng khai timesheet (Ref: business/04_architecture.md mục 2.3)
   */
  async deleteEntry(
    userId: string,
    entryId: string,
  ): Promise<{ success: boolean }> {
    const employee = await this.employeeRepository.findOne({
      where: { userId },
    });
    if (!employee) throw new BusinessException('ERR_TIMESHEET_002');

    const entry = await this.timesheetEntryRepository.findOne({
      where: { id: entryId },
    });
    if (!entry) throw new BusinessException('ERR_AUTH_003');

    // Chỉ owner mới được xóa entry
    const timesheet = await this.timesheetRepository.findOne({
      where: { id: entry.timesheetId },
    });
    if (!timesheet || timesheet.employeeId !== employee.id) {
      throw new BusinessException('ERR_AUTH_002');
    }

    if (timesheet.status !== 'DRAFT' && timesheet.status !== 'REJECTED') {
      throw new BusinessException('ERR_TIMESHEET_001');
    }

    await this.timesheetEntryRepository.remove(entry);
    return { success: true };
  }

  /**
   * Danh sách timesheet chờ duyệt cho PM/Trưởng phòng (cấp 1) hoặc HR Lead (cấp 2)
   * Ref: business/04_architecture.md mục 2.3
   */
  async getPendingApproval(userId: string, userRole: string): Promise<any[]> {
    // Lấy tất cả timesheet có ApprovalRequest status = PENDING, level hiện tại 1 hoặc 2
    const pendingTimesheets = await this.timesheetRepository
      .createQueryBuilder('ts')
      .leftJoinAndSelect('ts.approvalRequest', 'ar')
      .leftJoinAndSelect('ts.employee', 'emp')
      .leftJoinAndSelect('emp.department', 'dept')
      .where('ar.status = :status', { status: 'PENDING' })
      .andWhere('ts.status = :tsStatus', { tsStatus: 'PENDING_APPROVAL' })
      .getMany();

    // Filter theo role (PM/DEPT_LEAD = cấp 1, HR Lead/DEPT_LEAD = cấp 2 tuỳ nghiệp vụ)
    if (
      userRole === 'DIRECTOR' ||
      userRole === 'CHAIRMAN' ||
      userRole === 'ADMIN'
    ) {
      return pendingTimesheets;
    }

    // DEPT_LEAD: chỉ thấy direct report của mình
    if (userRole === 'DEPT_LEAD') {
      const manager = await this.employeeRepository.findOne({
        where: { userId },
      });
      if (!manager) return [];
      const deptIds: string[] = [];
      // Đơn giản hoá: DEPT_LEAD thấy tất cả (project sẽ bổ sung PM-level filter sau)
      return pendingTimesheets;
    }

    return [];
  }

  /**
   * Phê duyệt/từ chối timesheet — route trực tiếp ngoài approval-requests
   * Delegate cho ApprovalService engine (đảm bảo logic duyệt đa cấp nhất quán)
   */
  async approveOrReject(
    timesheetId: string,
    userId: string,
    action: 'APPROVE' | 'REJECT',
    comment: string,
  ): Promise<any> {
    const timesheet = await this.timesheetRepository.findOne({
      where: { id: timesheetId },
    });
    if (!timesheet) throw new BusinessException('ERR_AUTH_003');
    if (!timesheet.approvalRequestId)
      throw new BusinessException('ERR_UNKNOWN');

    if (action === 'APPROVE') {
      return this.approvalService.approve(
        timesheet.approvalRequestId,
        comment,
        userId,
      );
    }
    return this.approvalService.reject(
      timesheet.approvalRequestId,
      comment,
      userId,
    );
  }

  /**
   * Tổng hợp giờ OT theo tháng (Ref: business/04_architecture.md mục 2.3)
   */
  async getOtSummary(month: number, year: number): Promise<any[]> {
    // Lấy entries thuộc timesheets APPROVED của tháng đó
    const result = await this.timesheetEntryRepository
      .createQueryBuilder('entry')
      .leftJoinAndSelect('entry.timesheet', 'ts')
      .leftJoinAndSelect('ts.employee', 'emp')
      .select('emp.id', 'employeeId')
      .addSelect('emp.emp_code', 'empCode')
      .addSelect('emp.full_name', 'fullName')
      .addSelect(
        'SUM(CASE WHEN entry.work_type = :otWeekday THEN entry.hours_spent ELSE 0 END)',
        'otWeekdayHours',
      )
      .addSelect(
        'SUM(CASE WHEN entry.work_type = :otWeekend THEN entry.hours_spent ELSE 0 END)',
        'otWeekendHours',
      )
      .addSelect(
        'SUM(CASE WHEN entry.work_type = :otHoliday THEN entry.hours_spent ELSE 0 END)',
        'otHolidayHours',
      )
      .addSelect(
        'SUM(CASE WHEN entry.work_type = :nightShift THEN entry.hours_spent ELSE 0 END)',
        'nightShiftHours',
      )
      .addSelect('SUM(entry.hours_spent)', 'totalOtHours')
      .where('ts.status = :status', { status: 'APPROVED' })
      .andWhere('EXTRACT(MONTH FROM entry.entry_date) = :month', { month })
      .andWhere('EXTRACT(YEAR FROM entry.entry_date) = :year', { year })
      .groupBy('emp.id, emp.emp_code, emp.full_name')
      .setParameter('otWeekday', 'OT_WEEKDAY')
      .setParameter('otWeekend', 'OT_WEEKEND')
      .setParameter('otHoliday', 'OT_HOLIDAY')
      .setParameter('nightShift', 'NIGHT_SHIFT')
      .getRawMany();

    return result.map((r: any) => ({
      employeeId: r.employeeId,
      empCode: r.empcode,
      fullName: r.fullname,
      otWeekdayHours: parseFloat(r.otweekdayhours || 0),
      otWeekendHours: parseFloat(r.otweekendhours || 0),
      otHolidayHours: parseFloat(r.otholidayhours || 0),
      nightShiftHours: parseFloat(r.nightshifthours || 0),
      totalOtHours: parseFloat(r.totalOtHours || 0),
    }));
  }
}
