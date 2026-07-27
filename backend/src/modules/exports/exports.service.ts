import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import ExcelJS from 'exceljs';
import { Employee } from '../../entities/employee.entity';
import { Salary } from '../../entities/salary.entity';
import { Timesheet } from '../../entities/timesheet.entity';
import { TimesheetEntry } from '../../entities/timesheet-entry.entity';
import { LeaveRequest } from '../../entities/leave-request.entity';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class ExportsService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(Salary)
    private readonly salaryRepository: Repository<Salary>,
    @InjectRepository(Timesheet)
    private readonly timesheetRepository: Repository<Timesheet>,
    @InjectRepository(TimesheetEntry)
    private readonly timesheetEntryRepository: Repository<TimesheetEntry>,
    @InjectRepository(LeaveRequest)
    private readonly leaveRequestRepository: Repository<LeaveRequest>,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  /**
   * Xuất danh sách nhân viên ra Excel.
   */
  async exportEmployees(actor: {
    id: string;
    role: string;
    ip?: string;
    ua?: string;
  }): Promise<Buffer> {
    const employees = await this.employeeRepository.find({
      relations: { department: true, position: true, user: true },
      order: { empCode: 'ASC' },
    });

    const wb = new ExcelJS.Workbook();
    wb.creator = 'HRM System';
    wb.created = new Date();
    const sheet = wb.addWorksheet('Employees');

    sheet.columns = [
      { header: 'Mã NV', key: 'empCode', width: 12 },
      { header: 'Họ tên', key: 'fullName', width: 28 },
      { header: 'Email', key: 'email', width: 28 },
      { header: 'SĐT', key: 'phone', width: 14 },
      { header: 'Phòng ban', key: 'dept', width: 18 },
      { header: 'Vị trí', key: 'pos', width: 18 },
      { header: 'Trạng thái', key: 'status', width: 14 },
      { header: 'Ngày vào', key: 'joinDate', width: 12 },
      { header: 'Ngày sinh', key: 'dob', width: 12 },
    ];
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    for (const e of employees) {
      sheet.addRow({
        empCode: e.empCode ?? '',
        fullName: e.fullName,
        email: e.email,
        phone: e.phone ?? '',
        dept: e.department?.name ?? '',
        pos: e.position?.title ?? '',
        status: e.status,
        joinDate: e.joinDate
          ? new Date(e.joinDate).toISOString().split('T')[0]
          : '',
        dob: e.dob ? new Date(e.dob).toISOString().split('T')[0] : '',
      });
    }

    await this.auditLogsService.logExport({
      actorId: actor.id,
      actorRole: actor.role,
      entityName: 'employees',
      ipAddress: actor.ip,
      userAgent: actor.ua,
    });

    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
  }

  /**
   * Xuất bảng lương theo tháng/năm.
   */
  async exportSalaries(
    month: number,
    year: number,
    actor: { id: string; role: string; ip?: string; ua?: string },
  ): Promise<Buffer> {
    const salaries = await this.salaryRepository.find({
      where: { month, year },
      relations: { employee: { department: true, position: true } },
      order: { netSalary: 'DESC' },
    });

    const wb = new ExcelJS.Workbook();
    wb.creator = 'HRM System';
    const sheet = wb.addWorksheet(`Salaries-${month}-${year}`);

    sheet.columns = [
      { header: 'Mã NV', key: 'empCode', width: 12 },
      { header: 'Họ tên', key: 'fullName', width: 26 },
      { header: 'Phòng ban', key: 'dept', width: 18 },
      { header: 'Lương cơ bản', key: 'base', width: 16 },
      { header: 'Ngày công', key: 'workDays', width: 12 },
      { header: 'OT thường (h)', key: 'otN', width: 14 },
      { header: 'OT cuối tuần (h)', key: 'otW', width: 16 },
      { header: 'OT lễ (h)', key: 'otH', width: 12 },
      { header: 'Ca đêm (h)', key: 'ns', width: 12 },
      { header: 'OT Pay', key: 'otPay', width: 14 },
      { header: 'Phụ cấp ca đêm', key: 'nsBonus', width: 16 },
      { header: 'Phụ cấp', key: 'allowance', width: 14 },
      { header: 'Khấu trừ', key: 'deduction', width: 14 },
      { header: 'Thực lĩnh', key: 'net', width: 16 },
      { header: 'Trạng thái', key: 'status', width: 12 },
    ];
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    for (const s of salaries) {
      sheet.addRow({
        empCode: s.employee?.empCode ?? '',
        fullName: s.employee?.fullName ?? '',
        dept: s.employee?.department?.name ?? '',
        base: Number(s.baseSalary),
        workDays: Number(s.workDays),
        otN: Number(s.otNormalHours),
        otW: Number(s.otWeekendHours),
        otH: Number(s.otHolidayHours),
        ns: Number(s.nightShiftHours ?? 0),
        otPay: Number(s.otPayAmount),
        nsBonus: Number(s.nightShiftBonus ?? 0),
        allowance: Number(s.allowance),
        deduction: Number(s.deduction),
        net: Number(s.netSalary),
        status: s.status,
      });
    }

    await this.auditLogsService.logExport({
      actorId: actor.id,
      actorRole: actor.role,
      entityName: 'salaries',
      filters: { month, year },
      ipAddress: actor.ip,
      userAgent: actor.ua,
    });

    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
  }

  /**
   * Xuất OT summary (US-11).
   */
  async exportOtSummary(
    month: number,
    year: number,
    actor: { id: string; role: string; ip?: string; ua?: string },
  ): Promise<Buffer> {
    const result = await this.timesheetRepository
      .createQueryBuilder('ts')
      .leftJoinAndSelect('ts.employee', 'emp')
      .where('ts.status = :status', { status: 'APPROVED' })
      .andWhere(
        'EXISTS (SELECT 1 FROM timesheet_entries e WHERE e.timesheet_id = ts.id ' +
          'AND EXTRACT(MONTH FROM e.entry_date) = :month AND EXTRACT(YEAR FROM e.entry_date) = :year)',
        { month, year },
      )
      .getMany();

    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet(`OT-${month}-${year}`);
    sheet.columns = [
      { header: 'Mã NV', key: 'empCode', width: 12 },
      { header: 'Họ tên', key: 'fullName', width: 28 },
      { header: 'OT thường (h)', key: 'otN', width: 14 },
      { header: 'OT cuối tuần (h)', key: 'otW', width: 16 },
      { header: 'OT lễ (h)', key: 'otH', width: 12 },
      { header: 'Ca đêm (h)', key: 'ns', width: 12 },
      { header: 'Tổng OT (h)', key: 'total', width: 14 },
    ];
    sheet.getRow(1).font = { bold: true };

    for (const ts of result) {
      const entries = await this.timesheetEntryRepository.find({
        where: { timesheetId: ts.id },
      });
      const otN = entries
        .filter((e) => e.workType === 'OT_WEEKDAY')
        .reduce((s, e) => s + Number(e.hoursSpent), 0);
      const otW = entries
        .filter((e) => e.workType === 'OT_WEEKEND')
        .reduce((s, e) => s + Number(e.hoursSpent), 0);
      const otH = entries
        .filter((e) => e.workType === 'OT_HOLIDAY')
        .reduce((s, e) => s + Number(e.hoursSpent), 0);
      const ns = entries
        .filter((e) => e.workType === 'NIGHT_SHIFT')
        .reduce((s, e) => s + Number(e.hoursSpent), 0);
      sheet.addRow({
        empCode: ts.employee?.empCode ?? '',
        fullName: ts.employee?.fullName ?? '',
        otN,
        otW,
        otH,
        ns,
        total: otN + otW + otH + ns,
      });
    }

    await this.auditLogsService.logExport({
      actorId: actor.id,
      actorRole: actor.role,
      entityName: 'timesheets-ot-summary',
      filters: { month, year },
      ipAddress: actor.ip,
      userAgent: actor.ua,
    });

    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
  }

  /**
   * Xuất danh sách đơn nghỉ phép theo tháng.
   */
  async exportLeaveRequests(
    month: number,
    year: number,
    actor: { id: string; role: string; ip?: string; ua?: string },
  ): Promise<Buffer> {
    const all = await this.leaveRequestRepository.find({
      relations: { employee: true },
      order: { startDate: 'DESC' },
    });
    const filtered = all.filter((lr) => {
      const d = new Date(lr.startDate);
      return d.getMonth() + 1 === month && d.getFullYear() === year;
    });

    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet(`Leaves-${month}-${year}`);
    sheet.columns = [
      { header: 'Mã NV', key: 'empCode', width: 12 },
      { header: 'Họ tên', key: 'fullName', width: 26 },
      { header: 'Loại', key: 'leaveType', width: 16 },
      { header: 'Từ ngày', key: 'from', width: 12 },
      { header: 'Đến ngày', key: 'to', width: 12 },
      { header: 'Trạng thái', key: 'status', width: 14 },
      { header: 'Lý do', key: 'reason', width: 30 },
    ];
    sheet.getRow(1).font = { bold: true };

    for (const lr of filtered) {
      sheet.addRow({
        empCode: lr.employee?.empCode ?? '',
        fullName: lr.employee?.fullName ?? '',
        leaveType: lr.leaveType,
        from: new Date(lr.startDate).toISOString().split('T')[0],
        to: new Date(lr.endDate).toISOString().split('T')[0],
        status: lr.status,
        reason: lr.reason ?? '',
      });
    }

    await this.auditLogsService.logExport({
      actorId: actor.id,
      actorRole: actor.role,
      entityName: 'leave-requests',
      filters: { month, year },
      ipAddress: actor.ip,
      userAgent: actor.ua,
    });

    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
  }
}