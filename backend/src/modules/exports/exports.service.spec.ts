// --- jest setup ---
// Suppress raw SQL console noise from TypeORM
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'warn').mockImplementation(() => {});

// Import test utilities
const { MockRepository } = require('../../test/utils/mock-repository');

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ExportsService } from './exports.service';
import { Employee } from '../../entities/employee.entity';
import { Salary } from '../../entities/salary.entity';
import { Timesheet } from '../../entities/timesheet.entity';
import { TimesheetEntry } from '../../entities/timesheet-entry.entity';
import { LeaveRequest } from '../../entities/leave-request.entity';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

describe('ExportsService', () => {
  let service: ExportsService;
  let employeeRepo: any;
  let salaryRepo: any;
  let timesheetRepo: any;
  let timesheetEntryRepo: any;
  let leaveRepo: any;
  let auditLogsService: jest.Mocked<Partial<AuditLogsService>>;

  beforeEach(async () => {
    employeeRepo = new MockRepository();
    salaryRepo = new MockRepository();
    timesheetRepo = new MockRepository();
    timesheetEntryRepo = new MockRepository();
    leaveRepo = new MockRepository();
    auditLogsService = {
      logExport: jest.fn().mockResolvedValue({ id: 'log-id' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExportsService,
        {
          provide: getRepositoryToken(Employee),
          useValue: employeeRepo,
        },
        {
          provide: getRepositoryToken(Salary),
          useValue: salaryRepo,
        },
        {
          provide: getRepositoryToken(Timesheet),
          useValue: timesheetRepo,
        },
        {
          provide: getRepositoryToken(TimesheetEntry),
          useValue: timesheetEntryRepo,
        },
        {
          provide: getRepositoryToken(LeaveRequest),
          useValue: leaveRepo,
        },
        {
          provide: AuditLogsService,
          useValue: auditLogsService,
        },
      ],
    }).compile();

    service = module.get<ExportsService>(ExportsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('exportEmployees', () => {
    it('should export employees as Excel and log the export', async () => {
      const mockEmployees = [
        {
          id: '1',
          fullName: 'John Doe',
          email: 'john@example.com',
          department: { name: 'IT' },
          position: { title: 'Engineer' },
          status: 'OFFICIAL',
          empCode: 'EMP-001',
          phone: '0909123456',
          joinDate: new Date('2024-01-01'),
          dob: new Date('1995-01-01'),
        },
      ];
      employeeRepo.find = jest.fn().mockResolvedValue(mockEmployees);

      const result = await service.exportEmployees({ id: 'actor-1', role: 'ADMIN' });

      expect(employeeRepo.find).toHaveBeenCalledWith({
        relations: { department: true, position: true, user: true },
        order: { empCode: 'ASC' },
      });
      expect(auditLogsService.logExport).toHaveBeenCalledWith(expect.objectContaining({
        actorId: 'actor-1',
        actorRole: 'ADMIN',
        entityName: 'employees',
      }));
      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe('exportSalaries', () => {
    it('should export salaries as Excel and log the export', async () => {
      const mockSalaries = [
        {
          id: '1',
          payrollCode: 'PAY-1',
          employeeId: '1',
          month: 1,
          year: 2026,
          baseSalary: 15000000,
          employee: { fullName: 'John Doe', department: { name: 'IT' }, empCode: 'EMP-001' },
        },
      ];
      salaryRepo.find = jest.fn().mockResolvedValue(mockSalaries);

      const result = await service.exportSalaries(1, 2026, { id: 'actor-1', role: 'ADMIN' });

      expect(salaryRepo.find).toHaveBeenCalledWith({
        where: { month: 1, year: 2026 },
        relations: { employee: { department: true, position: true } },
        order: { netSalary: 'DESC' },
      });
      expect(auditLogsService.logExport).toHaveBeenCalledWith(expect.objectContaining({
        actorId: 'actor-1',
        actorRole: 'ADMIN',
        entityName: 'salaries',
        filters: { month: 1, year: 2026 },
      }));
      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe('exportOtSummary', () => {
    it('should export OT summary as Excel and log the export', async () => {
      const mockTimesheets = [
        {
          id: 'ts-1',
          employee: { empCode: 'EMP-001', fullName: 'John Doe' },
        },
      ];
      timesheetRepo.createQueryBuilder = jest.fn().mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockTimesheets),
      });
      timesheetEntryRepo.find = jest.fn().mockResolvedValue([
        { workType: 'OT_WEEKDAY', hoursSpent: 8 },
        { workType: 'OT_WEEKEND', hoursSpent: 4 },
      ]);

      const result = await service.exportOtSummary(1, 2026, { id: 'actor-1', role: 'ADMIN' });

      expect(timesheetRepo.createQueryBuilder).toHaveBeenCalled();
      expect(auditLogsService.logExport).toHaveBeenCalledWith(expect.objectContaining({
        actorId: 'actor-1',
        actorRole: 'ADMIN',
        entityName: 'timesheets-ot-summary',
        filters: { month: 1, year: 2026 },
      }));
      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe('exportLeaveRequests', () => {
    it('should export leave requests as Excel and log the export', async () => {
      const mockLeaveRequests = [
        {
          id: '1',
          employeeId: '1',
          leaveType: 'ANNUAL_LEAVE',
          status: 'APPROVED',
          startDate: new Date('2026-01-15'),
          endDate: new Date('2026-01-16'),
          reason: 'Vacation',
          employee: { fullName: 'John Doe', empCode: 'EMP-001' },
        },
      ];
      leaveRepo.find = jest.fn().mockResolvedValue(mockLeaveRequests);

      const result = await service.exportLeaveRequests(1, 2026, { id: 'actor-1', role: 'ADMIN' });

      expect(leaveRepo.find).toHaveBeenCalledWith({
        relations: { employee: true },
        order: { startDate: 'DESC' },
      });
      expect(auditLogsService.logExport).toHaveBeenCalledWith(expect.objectContaining({
        actorId: 'actor-1',
        actorRole: 'ADMIN',
        entityName: 'leave-requests',
        filters: { month: 1, year: 2026 },
      }));
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should filter leave requests by month and year', async () => {
      leaveRepo.find = jest.fn().mockResolvedValue([]);

      await service.exportLeaveRequests(6, 2026, { id: 'actor-1', role: 'ADMIN' });

      expect(leaveRepo.find).toHaveBeenCalledWith({
        relations: { employee: true },
        order: { startDate: 'DESC' },
      });
    });
  });
});
