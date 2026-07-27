// --- jest setup ---
// Suppress raw SQL console noise from TypeORM
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'warn').mockImplementation(() => {});

// Import test utilities
const { MockRepository } = require('../../test/utils/mock-repository');

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PinoLogger } from 'nestjs-pino';
import { TimesheetsService } from './timesheets.service';
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
import { BusinessException } from '../../common/exceptions/business.exception';

// Helper to create test entities
const createEmployeeMock = (overrides: any = {}) => ({
  id: 'emp-1',
  empCode: 'EMP-001',
  fullName: 'John Doe',
  userId: 'user-1',
  departmentId: 'dept-1',
  positionId: 'pos-1',
  status: 'OFFICIAL',
  ...overrides,
});

const createTimesheetMock = (overrides: any = {}) => ({
  id: 'ts-1',
  timesheetCode: 'TS-EMP-001-W01-2026',
  employeeId: 'emp-1',
  weekNumber: 1,
  year: 2026,
  startDate: new Date('2026-01-06'),
  endDate: new Date('2026-01-12'),
  totalNormalHours: 0,
  totalOtHours: 0,
  status: 'DRAFT',
  ...overrides,
});

const createTimesheetEntryMock = (overrides: any = {}) => ({
  id: 'entry-1',
  timesheetId: 'ts-1',
  projectId: 'proj-1',
  taskId: 'task-1',
  entryDate: new Date('2026-01-06'),
  hoursSpent: 8,
  workType: 'NORMAL',
  ...overrides,
});

const createProjectMock = (overrides: any = {}) => ({
  id: 'proj-1',
  projectCode: 'PRJ-001',
  name: 'Test Project',
  ...overrides,
});

const createProjectTaskMock = (overrides: any = {}) => ({
  id: 'task-1',
  projectId: 'proj-1',
  taskName: 'Test Task',
  ...overrides,
});

const createApprovalRequestMock = (overrides: any = {}) => ({
  id: 'approval-1',
  transactionType: 'TIMESHEET',
  referenceEntityId: 'ts-1',
  requesterId: 'emp-1',
  currentLevel: 1,
  totalLevels: 1,
  status: 'PENDING',
  ...overrides,
});

describe('TimesheetsService', () => {
  let service: TimesheetsService;
  let timesheetRepo: any;
  let timesheetEntryRepo: any;
  let employeeRepo: any;
  let projectRepo: any;
  let projectTaskRepo: any;
  let attendanceRepo: any;
  let workRateConfigRepo: any;
  let approvalRequestRepo: any;
  let approvalService: any;
  let attendanceService: any;
  let dataSource: any;

  beforeEach(async () => {
    timesheetRepo = new MockRepository();
    timesheetEntryRepo = new MockRepository();
    employeeRepo = new MockRepository();
    projectRepo = new MockRepository();
    projectTaskRepo = new MockRepository();
    attendanceRepo = new MockRepository();
    workRateConfigRepo = new MockRepository();
    approvalRequestRepo = new MockRepository();

    approvalService = {
      approve: jest.fn(),
      reject: jest.fn(),
    };

    attendanceService = {
      listForEmployeeInRange: jest.fn().mockResolvedValue([]),
    };

    dataSource = {
      transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimesheetsService,
        { provide: getRepositoryToken(Timesheet), useValue: timesheetRepo },
        { provide: getRepositoryToken(TimesheetEntry), useValue: timesheetEntryRepo },
        { provide: getRepositoryToken(Employee), useValue: employeeRepo },
        { provide: getRepositoryToken(Project), useValue: projectRepo },
        { provide: getRepositoryToken(ProjectTask), useValue: projectTaskRepo },
        { provide: getRepositoryToken(Attendance), useValue: attendanceRepo },
        { provide: getRepositoryToken(WorkRateConfig), useValue: workRateConfigRepo },
        { provide: getRepositoryToken(ApprovalRequest), useValue: approvalRequestRepo },
        { provide: ApprovalService, useValue: approvalService },
        { provide: AttendanceService, useValue: attendanceService },
        { provide: DataSource, useValue: dataSource },
        {
          provide: PinoLogger,
          useValue: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<TimesheetsService>(TimesheetsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // getMyWeekly()
  // -------------------------------------------------------------------------
  describe('getMyWeekly()', () => {
    it('should return timesheet with entries', async () => {
      const emp = createEmployeeMock();
      const ts = createTimesheetMock();
      const entries = [createTimesheetEntryMock()];

      employeeRepo.setFindOneReturned(emp);
      timesheetRepo.setFindOneReturned(ts);
      timesheetEntryRepo.setFindReturned(entries);
      projectRepo.setFindReturned([createProjectMock()]);
      projectTaskRepo.setFindReturned([createProjectTaskMock()]);

      const mockQueryBuilder = {
        insert: jest.fn().mockReturnThis(),
        into: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        orIgnore: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({}),
      };
      timesheetRepo.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

      const result = await service.getMyWeekly('user-1', 1, 2026);

      expect(result.timesheet).toBeDefined();
      expect(result.entries).toHaveLength(1);
    });

    it('should throw ERR_AUTH_001 when employee not found', async () => {
      employeeRepo.setFindOneReturned(null);

      await expect(service.getMyWeekly('nobody', 1, 2026)).rejects.toThrow(BusinessException);
    });
  });

  // -------------------------------------------------------------------------
  // saveEntries()
  // -------------------------------------------------------------------------
  describe('saveEntries()', () => {
    it('should save entries successfully for DRAFT timesheet', async () => {
      const emp = createEmployeeMock();
      const ts = createTimesheetMock({ status: 'DRAFT' });
      const entry = createTimesheetEntryMock();

      employeeRepo.setFindOneReturned(emp);
      timesheetRepo.setFindOneReturned(ts);
      timesheetEntryRepo.setFindReturned([entry]);
      workRateConfigRepo.setFindReturned([]);

      const dto = {
        entries: [
          {
            timesheetId: 'ts-1',
            projectId: 'proj-1',
            taskId: 'task-1',
            entryDate: '2026-01-06',
            hoursSpent: 8,
            workType: 'NORMAL',
            description: 'Work',
          },
        ],
      };

      const result = await service.saveEntries('user-1', dto);

      expect(result).toBeDefined();
      expect(result.entries).toBeDefined();
    });

    it('should throw ERR_AUTH_001 when employee not found', async () => {
      employeeRepo.setFindOneReturned(null);

      const dto = { entries: [] };

      await expect(service.saveEntries('nobody', dto)).rejects.toThrow(BusinessException);
    });
  });

  // -------------------------------------------------------------------------
  // submit()
  // -------------------------------------------------------------------------
  describe('submit()', () => {
    it('should submit DRAFT timesheet successfully', async () => {
      const emp = createEmployeeMock();
      const ts = createTimesheetMock({ status: 'DRAFT' });
      const updatedTs = createTimesheetMock({ status: 'PENDING_APPROVAL' });
      const savedReq = createApprovalRequestMock();

      employeeRepo.setFindOneReturned(emp);
      timesheetRepo.setFindOneReturned(ts);
      approvalRequestRepo.setSaveReturned(savedReq);
      timesheetRepo.setSaveReturned(updatedTs);

      const result = await service.submit('ts-1', 'user-1');

      expect(result).toBeDefined();
    });

    it('should throw ERR_UNKNOWN when timesheet not found', async () => {
      const emp = createEmployeeMock();

      employeeRepo.setFindOneReturned(emp);
      timesheetRepo.setFindOneReturned(null);

      await expect(service.submit('ts-1', 'user-1')).rejects.toThrow(BusinessException);
    });
  });

  // -------------------------------------------------------------------------
  // deleteEntry()
  // -------------------------------------------------------------------------
  describe('deleteEntry()', () => {
    it('should delete entry successfully', async () => {
      const emp = createEmployeeMock();
      const ts = createTimesheetMock({ status: 'DRAFT' });
      const entry = createTimesheetEntryMock();

      employeeRepo.setFindOneReturned(emp);
      timesheetRepo.setFindOneReturned(ts);
      timesheetEntryRepo.setFindOneReturned(entry);
      timesheetEntryRepo.setRemoveReturned(entry);

      const result = await service.deleteEntry('user-1', 'entry-1');

      expect(result).toEqual({ success: true });
    });

    it('should throw ERR_AUTH_002 when entry belongs to different employee', async () => {
      const emp = createEmployeeMock({ id: 'emp-1' });
      const otherTs = createTimesheetMock({ employeeId: 'emp-2', status: 'DRAFT' });
      const entry = createTimesheetEntryMock();

      employeeRepo.setFindOneReturned(emp);
      timesheetEntryRepo.setFindOneReturned(entry);
      timesheetRepo.setFindOneReturned(otherTs);

      await expect(service.deleteEntry('user-1', 'entry-1')).rejects.toThrow(BusinessException);
    });
  });

  // -------------------------------------------------------------------------
  // getPendingApproval()
  // -------------------------------------------------------------------------
  describe('getPendingApproval()', () => {
    it('should return pending timesheets for ADMIN role', async () => {
      const ts1 = createTimesheetMock({ id: 'ts-1' });
      const ts2 = createTimesheetMock({ id: 'ts-2' });

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        setParameter: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([ts1, ts2]),
      };
      timesheetRepo.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

      const result = await service.getPendingApproval('admin-user', 'ADMIN');

      expect(result).toHaveLength(2);
    });

    it('should return empty array for EMPLOYEE role', async () => {
      const result = await service.getPendingApproval('emp-user', 'EMPLOYEE');

      expect(result).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // getOtSummary()
  // -------------------------------------------------------------------------
  describe('getOtSummary()', () => {
    it('should return aggregated OT summary', async () => {
      const rawResults = [
        {
          employeeId: 'emp-1',
          empcode: 'EMP-001',
          fullname: 'John Doe',
          otweekdayhours: '10',
          otweekendhours: '5',
          otholidayhours: '2',
          nightshifthours: '3',
          totalOtHours: '20',
        },
      ];

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        setParameter: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(rawResults),
      };
      timesheetEntryRepo.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

      const result = await service.getOtSummary(1, 2026);

      expect(result).toHaveLength(1);
      expect(result[0].employeeId).toBe('emp-1');
    });

    it('should return empty array when no OT data', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        setParameter: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };
      timesheetEntryRepo.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

      const result = await service.getOtSummary(1, 2026);

      expect(result).toEqual([]);
    });
  });
});
