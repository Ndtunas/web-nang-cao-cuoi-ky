// --- jest setup ---
// Suppress raw SQL console noise from TypeORM
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'warn').mockImplementation(() => {});

// Import test utilities
const { MockRepository } = require('../../test/utils/mock-repository');
const { createUser, createEmployee, createUserWithEmployee } = require('../../test/utils/mock-entities');

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PayrollService } from './payroll.service';
import { Salary } from '../../entities/salary.entity';
import { Employee } from '../../entities/employee.entity';
import { Attendance } from '../../entities/attendance.entity';
import { TimesheetEntry } from '../../entities/timesheet-entry.entity';
import { LeaveRequest } from '../../entities/leave-request.entity';
import { Notification } from '../../entities/notification.entity';
import { WorkRateConfig } from '../../entities/work-rate-config.entity';
import { ApprovalRequest } from '../../entities/approval-request.entity';
import { Timesheet } from '../../entities/timesheet.entity';
import { BusinessException } from '../../common/exceptions/business.exception';

// Error codes
const ERR_PAYROLL_001 = 'Salary has already been calculated for this month';

describe('PayrollService', () => {
  let service: PayrollService;
  let salaryRepo: any;
  let employeeRepo: any;
  let attendanceRepo: any;
  let timesheetEntryRepo: any;
  let leaveRepo: any;
  let notificationRepo: any;
  let workRateConfigRepo: any;
  let approvalRequestRepo: any;
  let timesheetRepo: any;
  let dataSource: any;

  const mockSalaryRepo = () => ({
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    findAndCount: jest.fn(),
    createQueryBuilder: jest.fn(),
  });

  const mockEmployeeRepo = () => ({
    findOne: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
  });

  const mockAttendanceRepo = () => ({
    findOne: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
  });

  const mockTimesheetEntryRepo = () => ({
    findOne: jest.fn(),
    find: jest.fn(),
  });

  const mockLeaveRepo = () => ({
    findOne: jest.fn(),
    find: jest.fn(),
  });

  const mockNotificationRepo = () => ({
    save: jest.fn(),
    create: jest.fn(),
  });

  const mockWorkRateConfigRepo = () => ({
    findOne: jest.fn(),
    find: jest.fn(),
  });

  const mockApprovalRequestRepo = () => ({
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
  });

  const mockTimesheetRepo = () => ({
    findOne: jest.fn(),
    find: jest.fn(),
  });

  const mockDataSource = () => ({
    transaction: jest.fn(),
    getRepository: jest.fn(),
  });

  beforeEach(async () => {
    salaryRepo = mockSalaryRepo() as any;
    employeeRepo = mockEmployeeRepo() as any;
    attendanceRepo = mockAttendanceRepo() as any;
    timesheetEntryRepo = mockTimesheetEntryRepo() as any;
    leaveRepo = mockLeaveRepo() as any;
    notificationRepo = mockNotificationRepo() as any;
    workRateConfigRepo = mockWorkRateConfigRepo() as any;
    approvalRequestRepo = mockApprovalRequestRepo() as any;
    timesheetRepo = mockTimesheetRepo() as any;
    dataSource = mockDataSource() as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayrollService,
        {
          provide: getRepositoryToken(Salary),
          useValue: salaryRepo,
        },
        {
          provide: getRepositoryToken(Employee),
          useValue: employeeRepo,
        },
        {
          provide: getRepositoryToken(Attendance),
          useValue: attendanceRepo,
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
          provide: getRepositoryToken(Notification),
          useValue: notificationRepo,
        },
        {
          provide: getRepositoryToken(WorkRateConfig),
          useValue: workRateConfigRepo,
        },
        {
          provide: getRepositoryToken(ApprovalRequest),
          useValue: approvalRequestRepo,
        },
        {
          provide: getRepositoryToken(Timesheet),
          useValue: timesheetRepo,
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile();

    service = module.get<PayrollService>(PayrollService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSalaries', () => {
    it('should return salaries for a given month and year', async () => {
      const salaries = [
        {
          id: 'sal-1',
          employeeId: 'emp-1',
          month: 6,
          year: 2025,
          baseSalary: 15000000,
          netSalary: 16000000,
          status: 'APPROVED',
        },
      ];

      salaryRepo.find.mockResolvedValue(salaries);

      const result = await service.getSalaries(6, 2025);

      expect(result).toEqual(salaries);
      expect(salaryRepo.find).toHaveBeenCalledWith({
        where: { month: 6, year: 2025 },
        relations: {
          employee: {
            department: true,
            position: true,
          },
        },
        order: { netSalary: 'DESC' },
      });
    });

    it('should return empty array when no salaries found', async () => {
      salaryRepo.find.mockResolvedValue([]);

      const result = await service.getSalaries(1, 2025);

      expect(result).toEqual([]);
    });
  });

  describe('getMyPayslip', () => {
    it('should return payslip for the employee', async () => {
      const employee = { id: 'emp-1', userId: 'user-1', department: { name: 'IT' }, position: { title: 'Engineer' } };
      const payslip = {
        id: 'sal-1',
        employeeId: 'emp-1',
        month: 6,
        year: 2025,
        baseSalary: 15000000,
        netSalary: 16000000,
        status: 'APPROVED',
        employee,
      };

      employeeRepo.findOne.mockResolvedValue(employee);
      salaryRepo.findOne.mockResolvedValue(payslip);

      const result = await service.getMyPayslip('user-1', 6, 2025);

      expect(result).toEqual(payslip);
      expect(employeeRepo.findOne).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        relations: { department: true, position: true },
      });
    });

    it('should return null when employee not found', async () => {
      employeeRepo.findOne.mockResolvedValue(null);

      const result = await service.getMyPayslip('unknown-user', 6, 2025);

      expect(result).toBeNull();
    });

    it('should return null when payslip not found', async () => {
      const employee = { id: 'emp-1', userId: 'user-1' };

      employeeRepo.findOne.mockResolvedValue(employee);
      salaryRepo.findOne.mockResolvedValue(null);

      const result = await service.getMyPayslip('user-1', 6, 2025);

      expect(result).toBeNull();
    });
  });

  describe('calculateMonthly', () => {
    it('should calculate salary for one employee with no existing salary', async () => {
      const employee = {
        id: 'emp-1',
        status: 'OFFICIAL',
        position: { baseSalaryRatio: 1.0 },
      };
      const timesheets = [
        {
          id: 'ts-1',
          employeeId: 'emp-1',
          startDate: new Date('2025-06-02'),
          endDate: new Date('2025-06-06'),
        },
      ];
      const timesheetEntries = [
        {
          id: 'entry-1',
          timesheetId: 'ts-1',
          hoursSpent: 8,
          workType: 'NORMAL',
        },
        {
          id: 'entry-2',
          timesheetId: 'ts-1',
          hoursSpent: 2,
          workType: 'OT_WEEKDAY',
        },
      ];
      const workRateConfigs = [
        { configKey: 'STANDARD_WORK_DAYS_MONTH', valueMultiplier: 22.0 },
        { configKey: 'STANDARD_WORK_HOURS_DAY', valueMultiplier: 8.0 },
        { configKey: 'OT_RATE_WEEKDAY', valueMultiplier: 1.5 },
        { configKey: 'OT_RATE_WEEKEND', valueMultiplier: 2.0 },
        { configKey: 'OT_RATE_HOLIDAY', valueMultiplier: 3.0 },
        { configKey: 'NIGHT_SHIFT_BONUS', valueMultiplier: 0.3 },
      ];
      const calculatedSalary = {
        id: 'sal-1',
        employeeId: 'emp-1',
        month: 6,
        year: 2025,
        baseSalary: 15000000,
        status: 'DRAFT',
      };

      employeeRepo.find.mockResolvedValue([employee]);
      workRateConfigRepo.find.mockResolvedValue(workRateConfigs as any);
      salaryRepo.findOne.mockResolvedValue(null);
      timesheetRepo.find.mockResolvedValue(timesheets);
      timesheetEntryRepo.find.mockResolvedValue(timesheetEntries);
      salaryRepo.create.mockImplementation((data) => data);
      salaryRepo.save.mockImplementation((entity) => Promise.resolve({ ...entity, id: 'sal-1' }));
      // The service calls getSalaries at the end, which calls find
      salaryRepo.find.mockResolvedValue([calculatedSalary]);

      const result = await service.calculateMonthly({ month: 6, year: 2025 });

      expect(result).toBeDefined();
      expect(salaryRepo.save).toHaveBeenCalled();
    });

    it('should throw ERR_PAYROLL_001 when salary already finalized', async () => {
      const employee = {
        id: 'emp-1',
        status: 'OFFICIAL',
        position: { baseSalaryRatio: 1.0 },
      };
      const existingSalary = {
        id: 'sal-1',
        employeeId: 'emp-1',
        month: 6,
        year: 2025,
        baseSalary: 15000000,
        status: 'APPROVED',
      };
      const workRateConfigs = [
        { configKey: 'STANDARD_WORK_DAYS_MONTH', valueMultiplier: 22.0 },
        { configKey: 'STANDARD_WORK_HOURS_DAY', valueMultiplier: 8.0 },
        { configKey: 'OT_RATE_WEEKDAY', valueMultiplier: 1.5 },
      ];

      employeeRepo.find.mockResolvedValue([employee]);
      workRateConfigRepo.find.mockResolvedValue(workRateConfigs as any);
      salaryRepo.findOne.mockResolvedValue(existingSalary);

      await expect(service.calculateMonthly({ month: 6, year: 2025 })).rejects.toMatchObject({
        errorCode: 'ERR_PAYROLL_001',
      });
    });

    it('should handle empty employee list', async () => {
      employeeRepo.find.mockResolvedValue([]);
      workRateConfigRepo.find.mockResolvedValue([]);
      salaryRepo.find.mockResolvedValue([]);

      const result = await service.calculateMonthly({ month: 6, year: 2025 });

      expect(result).toEqual([]);
    });
  });

  describe('approveMonthly', () => {
    it('should approve all DRAFT salaries for the month', async () => {
      const draftSalaries = [
        {
          id: 'sal-1',
          employeeId: 'emp-1',
          month: 6,
          year: 2025,
          status: 'APPROVED',
        },
        {
          id: 'sal-2',
          employeeId: 'emp-2',
          month: 6,
          year: 2025,
          status: 'APPROVED',
        },
      ];

      salaryRepo.createQueryBuilder = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 2 }),
      } as any);
      salaryRepo.find.mockResolvedValue(draftSalaries);

      const result = await service.approveMonthly({ month: 6, year: 2025 });

      expect(result.updated).toBe(2);
      expect(result.salaries).toEqual(draftSalaries);
      expect(salaryRepo.createQueryBuilder).toHaveBeenCalled();
    });

    it('should handle no DRAFT salaries', async () => {
      salaryRepo.createQueryBuilder = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 0 }),
      } as any);
      salaryRepo.find.mockResolvedValue([]);

      const result = await service.approveMonthly({ month: 6, year: 2025 });

      expect(result.updated).toBe(0);
      expect(result.salaries).toEqual([]);
    });
  });
});
