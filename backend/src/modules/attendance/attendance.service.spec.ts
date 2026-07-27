// --- jest setup ---
// Suppress raw SQL console noise from TypeORM
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'warn').mockImplementation(() => {});

// Import test utilities
const { createUser, createEmployee, createUserWithEmployee } = require('../../test/utils/mock-entities');

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AttendanceService } from './attendance.service';
import { Attendance } from '../../entities/attendance.entity';
import { Employee } from '../../entities/employee.entity';
import { TimesheetEntry } from '../../entities/timesheet-entry.entity';
import { Notification } from '../../entities/notification.entity';
import { BusinessException } from '../../common/exceptions/business.exception';

describe('AttendanceService', () => {
  let service: AttendanceService;
  let attendanceRepo: any;
  let employeeRepo: any;
  let timesheetEntryRepo: any;
  let notificationRepo: any;
  let dataSource: jest.Mocked<any>;

  const mockAttendanceRepo = () => ({
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

  const mockTimesheetEntryRepo = () => ({
    findOne: jest.fn(),
    find: jest.fn(),
  });

  const mockNotificationRepo = () => ({
    save: jest.fn(),
    create: jest.fn(),
  });

  const mockDataSource = () => ({
    transaction: jest.fn(),
    getRepository: jest.fn(),
  });

  beforeEach(async () => {
    attendanceRepo = mockAttendanceRepo() as any;
    employeeRepo = mockEmployeeRepo() as any;
    timesheetEntryRepo = mockTimesheetEntryRepo() as any;
    notificationRepo = mockNotificationRepo() as any;
    dataSource = mockDataSource() as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        {
          provide: getRepositoryToken(Attendance),
          useValue: attendanceRepo,
        },
        {
          provide: getRepositoryToken(Employee),
          useValue: employeeRepo,
        },
        {
          provide: getRepositoryToken(TimesheetEntry),
          useValue: timesheetEntryRepo,
        },
        {
          provide: getRepositoryToken(Notification),
          useValue: notificationRepo,
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile();

    service = module.get<AttendanceService>(AttendanceService);

    // Mock private helper methods
    jest.spyOn(service as any, 'nowTimeString').mockReturnValue('14:30:00');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkIn', () => {
    it('should successfully check in when no existing record', async () => {
      const employee = createEmployee({ id: 'emp-1', userId: 'user-1' });
      const savedAttendance = {
        id: 'att-1',
        employeeId: 'emp-1',
        workDate: expect.any(String),
        checkIn: '14:30:00',
        checkOut: null,
        workHours: 0,
        status: 'PRESENT',
      };

      employeeRepo.findOne.mockResolvedValue(employee);
      attendanceRepo.findOne.mockResolvedValue(null);

      dataSource.transaction.mockImplementation(async (cb) => {
        const manager = {
          getRepository: jest.fn().mockReturnValue({
            save: jest.fn().mockResolvedValue(savedAttendance),
            create: jest.fn().mockReturnValue(savedAttendance),
          }),
        };
        return cb(manager);
      });

      const result = await service.checkIn('user-1');

      expect(result).toBeDefined();
      expect(result.employeeId).toBe('emp-1');
      expect(dataSource.transaction).toHaveBeenCalled();
    });

    it('should throw ERR_EMP_001 when already checked in', async () => {
      const employee = createEmployee({ id: 'emp-1', userId: 'user-1' });
      const existingAttendance = {
        id: 'att-1',
        employeeId: 'emp-1',
        workDate: expect.any(String),
        checkIn: '08:00:00',
        checkOut: null,
        status: 'PRESENT',
      };

      employeeRepo.findOne.mockResolvedValue(employee);
      attendanceRepo.findOne.mockResolvedValue(existingAttendance);

      await expect(service.checkIn('user-1')).rejects.toMatchObject({
        errorCode: 'ERR_EMP_001',
      });
    });

    it('should throw ERR_AUTH_003 when employee not found', async () => {
      employeeRepo.findOne.mockResolvedValue(null);

      await expect(service.checkIn('unknown-user')).rejects.toMatchObject({
        errorCode: 'ERR_AUTH_003',
      });
    });
  });

  describe('checkOut', () => {
    it('should successfully check out', async () => {
      const employee = createEmployee({ id: 'emp-1', userId: 'user-1' });
      const existingAttendance = {
        id: 'att-1',
        employeeId: 'emp-1',
        workDate: expect.any(String),
        checkIn: '08:00:00',
        checkOut: null,
        status: 'PRESENT',
      };

      employeeRepo.findOne.mockResolvedValue(employee);
      attendanceRepo.findOne.mockResolvedValue(existingAttendance);
      attendanceRepo.save.mockResolvedValue({
        ...existingAttendance,
        checkOut: '14:30:00',
        workHours: 6.5,
        status: 'PRESENT',
      });

      const result = await service.checkOut('user-1');

      expect(result).toBeDefined();
      expect(attendanceRepo.save).toHaveBeenCalled();
    });

    it('should throw ERR_EMP_002 when no check-in record found', async () => {
      const employee = createEmployee({ id: 'emp-1', userId: 'user-1' });

      employeeRepo.findOne.mockResolvedValue(employee);
      attendanceRepo.findOne.mockResolvedValue(null);

      await expect(service.checkOut('user-1')).rejects.toMatchObject({
        errorCode: 'ERR_EMP_002',
      });
    });

    it('should throw ERR_EMP_002 when check-in time is not set', async () => {
      const employee = createEmployee({ id: 'emp-1', userId: 'user-1' });
      const existingAttendance = {
        id: 'att-1',
        employeeId: 'emp-1',
        workDate: expect.any(String),
        checkIn: null,
        checkOut: null,
        status: 'ABSENT',
      };

      employeeRepo.findOne.mockResolvedValue(employee);
      attendanceRepo.findOne.mockResolvedValue(existingAttendance);

      await expect(service.checkOut('user-1')).rejects.toMatchObject({
        errorCode: 'ERR_EMP_002',
      });
    });

    it('should throw ERR_ATT_002 when check-out time exceeds latest', async () => {
      const employee = createEmployee({ id: 'emp-1', userId: 'user-1' });
      const existingAttendance = {
        id: 'att-1',
        employeeId: 'emp-1',
        workDate: expect.any(String),
        checkIn: '08:00:00',
        checkOut: null,
        status: 'PRESENT',
      };

      employeeRepo.findOne.mockResolvedValue(employee);
      attendanceRepo.findOne.mockResolvedValue(existingAttendance);
      // Set time to be past CHECKOUT_LATEST (23:59:00)
      jest.spyOn(service as any, 'nowTimeString').mockReturnValue('23:59:30');

      await expect(service.checkOut('user-1')).rejects.toMatchObject({
        errorCode: 'ERR_ATT_002',
      });
    });
  });

  describe('getToday', () => {
    it('should return attendance record for today', async () => {
      const employee = createEmployee({ id: 'emp-1', userId: 'user-1' });
      const attendance = {
        id: 'att-1',
        employeeId: 'emp-1',
        workDate: expect.any(String),
        checkIn: '08:00:00',
        checkOut: null,
        status: 'PRESENT',
      };

      employeeRepo.findOne.mockResolvedValue(employee);
      attendanceRepo.findOne.mockResolvedValue(attendance);

      const result = await service.getToday('user-1');

      expect(result).toBeDefined();
      expect(result?.checkIn).toBe('08:00:00');
    });

    it('should return null when no attendance record exists', async () => {
      const employee = createEmployee({ id: 'emp-1', userId: 'user-1' });

      employeeRepo.findOne.mockResolvedValue(employee);
      attendanceRepo.findOne.mockResolvedValue(null);

      const result = await service.getToday('user-1');

      expect(result).toBeNull();
    });

    it('should return null when employee not found', async () => {
      employeeRepo.findOne.mockResolvedValue(null);

      const result = await service.getToday('unknown-user');

      expect(result).toBeNull();
    });
  });

  describe('evaluateTodayAbsence', () => {
    it('should return ABSENT when employee has not checked in', async () => {
      const employee = createEmployee({ id: 'emp-1', userId: 'user-1' });

      employeeRepo.findOne.mockResolvedValue(employee);
      attendanceRepo.findOne.mockResolvedValue(null);

      const result = await service.evaluateTodayAbsence('user-1');

      expect(result.checkedIn).toBe(false);
    });

    it('should throw ERR_AUTH_003 when employee not found', async () => {
      employeeRepo.findOne.mockResolvedValue(null);

      await expect(service.evaluateTodayAbsence('unknown-user')).rejects.toThrow(BusinessException);
    });
  });

  describe('getMyHistory', () => {
    it('should return attendance history for employee', async () => {
      const employee = createEmployee({ id: 'emp-1', userId: 'user-1' });
      const attendances = [
        { id: 'att-1', employeeId: 'emp-1', workDate: '2025-06-15' },
        { id: 'att-2', employeeId: 'emp-1', workDate: '2025-06-14' },
      ];

      employeeRepo.findOne.mockResolvedValue(employee);
      attendanceRepo.find.mockResolvedValue(attendances as any);

      const result = await service.getMyHistory('user-1');

      expect(result).toEqual(attendances);
    });

    it('should return empty array when employee not found', async () => {
      employeeRepo.findOne.mockResolvedValue(null);

      const result = await service.getMyHistory('unknown-user');

      expect(result).toEqual([]);
    });
  });

  describe('getAll', () => {
    it('should return all attendances', async () => {
      const attendances = [
        { id: 'att-1', employeeId: 'emp-1', workDate: '2025-06-15' },
      ];

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(attendances),
      };
      attendanceRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getAll();

      expect(result).toEqual(attendances);
    });
  });

  describe('statsMonth', () => {
    it('should return monthly statistics', async () => {
      const employee = createEmployee({ id: 'emp-1', userId: 'user-1' });
      const records = [
        { id: 'att-1', status: 'PRESENT', checkIn: '08:00:00', checkOut: '17:00:00', workHours: 9 },
        { id: 'att-2', status: 'LATE', checkIn: '09:00:00', checkOut: '18:00:00', workHours: 9 },
        { id: 'att-3', status: 'ABSENT', checkIn: null, checkOut: null, workHours: 0 },
      ];

      employeeRepo.findOne.mockResolvedValue(employee);

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(records),
      };
      attendanceRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.statsMonth('user-1', 6, 2025);

      expect(result.present).toBe(1);
      expect(result.late).toBe(1);
      expect(result.absent).toBe(1);
      expect(result.total).toBe(3);
    });

    it('should throw ERR_AUTH_003 when employee not found', async () => {
      employeeRepo.findOne.mockResolvedValue(null);

      await expect(service.statsMonth('unknown-user', 6, 2025)).rejects.toThrow(BusinessException);
    });
  });

  describe('autoCheckoutIfMissing', () => {
    it('should auto checkout employee with missing check-out', async () => {
      const existingAttendance = {
        id: 'att-1',
        employeeId: 'emp-1',
        workDate: '2025-06-15',
        checkIn: '08:00:00',
        checkOut: null,
        status: 'PRESENT',
      };

      attendanceRepo.findOne.mockResolvedValue(existingAttendance);
      attendanceRepo.save.mockResolvedValue({
        ...existingAttendance,
        checkOut: '18:00:00',
        workHours: 10,
        status: 'PRESENT',
      });

      const result = await service.autoCheckoutIfMissing('emp-1', '2025-06-15');

      expect(result!.checkOut).toBe('18:00:00');
      expect(attendanceRepo.save).toHaveBeenCalled();
    });

    it('should return null when no attendance record found', async () => {
      attendanceRepo.findOne.mockResolvedValue(null);

      const result = await service.autoCheckoutIfMissing('emp-1', '2025-06-15');

      expect(result).toBeNull();
      expect(attendanceRepo.save).not.toHaveBeenCalled();
    });
  });
});
