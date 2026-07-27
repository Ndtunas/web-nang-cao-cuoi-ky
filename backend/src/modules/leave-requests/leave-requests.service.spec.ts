// --- jest setup ---
// Suppress raw SQL console noise from TypeORM
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'warn').mockImplementation(() => {});

// Import test utilities
const { MockRepository } = require('../../test/utils/mock-repository');

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { LeaveRequestsService } from './leave-requests.service';
import { LeaveRequest } from '../../entities/leave-request.entity';
import { Employee } from '../../entities/employee.entity';
import { ApprovalRequest } from '../../entities/approval-request.entity';
import { Notification } from '../../entities/notification.entity';
import { User } from '../../entities/user.entity';
import { ApprovalConfig } from '../../entities/approval-config.entity';
import { BusinessException } from '../../common/exceptions/business.exception';

// Error codes (match the actual service implementation)

describe('LeaveRequestsService', () => {
  let service: LeaveRequestsService;
  let leaveRepo: any;
  let employeeRepo: any;
  let approvalRequestRepo: any;
  let notificationRepo: any;
  let userRepo: any;
  let approvalConfigRepo: any;
  let dataSource: any;

  const mockLeaveRepo = () => ({
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  });

  const mockEmployeeRepo = () => ({
    findOne: jest.fn(),
    find: jest.fn(),
  });

  const mockApprovalRequestRepo = () => ({
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  });

  const mockNotificationRepo = () => ({
    save: jest.fn(),
    create: jest.fn(),
  });

  const mockUserRepo = () => ({
    findOne: jest.fn(),
  });

  const mockApprovalConfigRepo = () => ({
    findOne: jest.fn(),
  });

  const mockDataSource = () => ({
    transaction: jest.fn(),
    getRepository: jest.fn(),
    createQueryBuilder: jest.fn(),
  });

  beforeEach(async () => {
    leaveRepo = mockLeaveRepo() as any;
    employeeRepo = mockEmployeeRepo() as any;
    approvalRequestRepo = mockApprovalRequestRepo() as any;
    notificationRepo = mockNotificationRepo() as any;
    userRepo = mockUserRepo() as any;
    approvalConfigRepo = mockApprovalConfigRepo() as any;
    dataSource = mockDataSource() as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaveRequestsService,
        {
          provide: getRepositoryToken(LeaveRequest),
          useValue: leaveRepo,
        },
        {
          provide: getRepositoryToken(Employee),
          useValue: employeeRepo,
        },
        {
          provide: getRepositoryToken(ApprovalRequest),
          useValue: approvalRequestRepo,
        },
        {
          provide: getRepositoryToken(Notification),
          useValue: notificationRepo,
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepo,
        },
        {
          provide: getRepositoryToken(ApprovalConfig),
          useValue: approvalConfigRepo,
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile();

    service = module.get<LeaveRequestsService>(LeaveRequestsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('submitLeave', () => {
    const createMockUser = (id = 'user-1') => ({
      id,
      username: 'johndoe',
      email: 'john@example.com',
      role: 'EMPLOYEE',
      status: 'ACTIVE',
    });

    const createMockEmployee = (id = 'emp-1', userId = 'user-1') => ({
      id,
      empCode: 'EMP-001',
      fullName: 'John Doe',
      email: 'john@example.com',
      status: 'OFFICIAL',
      userId,
      annualLeaveBalance: 12,
      departmentId: 'dept-1',
    });

    const createMockLeaveBalance = (employeeId = 'emp-1') => ({
      id: 'lb-1',
      employeeId,
      leaveYear: 2025,
      leaveMonth: 6,
      annualLeaveTotal: 12,
      annualLeaveUsed: 2,
      annualLeaveRemaining: 10,
    });

    const createMockApprovalConfig = (txType = 'LEAVE_SHORT') => ({
      id: 'config-1',
      transactionType: txType,
      requiredLevels: 1,
      approverRolesSequence: ['DEPT_LEAD'],
    });

    it('should successfully submit LEAVE_SHORT request (≤2 days)', async () => {
      const user = createMockUser();
      const employee = createMockEmployee();
      const leaveBalance = createMockLeaveBalance();
      const approvalConfig = createMockApprovalConfig('LEAVE_SHORT');
      const savedLeave = {
        id: 'leave-1',
        employeeId: 'emp-1',
        leaveType: 'ANNUAL_LEAVE',
        startDate: new Date('2025-06-10'),
        endDate: new Date('2025-06-11'),
        reason: 'Personal',
        status: 'PENDING',
      };
      const savedApproval = {
        id: 'apr-1',
        transactionType: 'LEAVE_SHORT',
        referenceEntityId: 'leave-1',
        requesterId: 'emp-1',
        currentLevel: 1,
        totalLevels: 1,
        status: 'PENDING',
      };

      userRepo.findOne.mockResolvedValue(user);
      employeeRepo.findOne.mockResolvedValue(employee);
      approvalConfigRepo.findOne.mockResolvedValue(approvalConfig);
      leaveRepo.findOne.mockResolvedValue(null); // No overlapping dates

      dataSource.transaction.mockImplementation(async (cb) => {
        const manager = {
          getRepository: jest.fn().mockReturnValue({
            save: jest.fn().mockImplementation((entity) => {
              if (entity.leaveType) return Promise.resolve({ ...entity, id: 'leave-1' });
              return Promise.resolve({ ...entity, id: 'apr-1' });
            }),
            create: jest.fn().mockImplementation((data) => data),
          }),
          createQueryBuilder: jest.fn().mockReturnValue({
            insert: jest.fn().mockReturnThis(),
            into: jest.fn().mockReturnThis(),
            values: jest.fn().mockReturnThis(),
            returning: jest.fn().mockReturnThis(),
            execute: jest.fn().mockResolvedValue({ generatedMaps: [savedLeave] }),
          }),
        };
        return cb(manager);
      });

      const result = await service.submitLeave(
        {
          leaveType: 'ANNUAL_LEAVE',
          startDate: '2025-06-10',
          endDate: '2025-06-11',
          reason: 'Personal',
        },
        'user-1',
      );

      expect(result.leaveRequest).toBeDefined();
      expect(result.approvalRequest).toBeDefined();
      expect(dataSource.transaction).toHaveBeenCalled();
    });

    it('should successfully submit LEAVE_LONG request (>2 days)', async () => {
      const user = createMockUser();
      const employee = createMockEmployee();
      const leaveBalance = createMockLeaveBalance();
      const approvalConfig = createMockApprovalConfig('LEAVE_LONG');
      const savedLeave = {
        id: 'leave-1',
        employeeId: 'emp-1',
        leaveType: 'ANNUAL_LEAVE',
        startDate: new Date('2025-06-10'),
        endDate: new Date('2025-06-15'),
        reason: 'Vacation',
        status: 'PENDING',
      };
      const savedApproval = {
        id: 'apr-1',
        transactionType: 'LEAVE_LONG',
        referenceEntityId: 'leave-1',
        requesterId: 'emp-1',
        currentLevel: 1,
        totalLevels: 2,
        status: 'PENDING',
      };

      userRepo.findOne.mockResolvedValue(user);
      employeeRepo.findOne.mockResolvedValue(employee);
      approvalConfigRepo.findOne.mockResolvedValue(approvalConfig);
      leaveRepo.findOne.mockResolvedValue(null);

      dataSource.transaction.mockImplementation(async (cb) => {
        const manager = {
          getRepository: jest.fn().mockReturnValue({
            save: jest.fn().mockImplementation((entity) => {
              if (entity.leaveType) return Promise.resolve({ ...entity, id: 'leave-1' });
              return Promise.resolve({ ...entity, id: 'apr-1' });
            }),
            create: jest.fn().mockImplementation((data) => data),
          }),
          createQueryBuilder: jest.fn().mockReturnValue({
            insert: jest.fn().mockReturnThis(),
            into: jest.fn().mockReturnThis(),
            values: jest.fn().mockReturnThis(),
            returning: jest.fn().mockReturnThis(),
            execute: jest.fn().mockResolvedValue({ generatedMaps: [savedLeave] }),
          }),
        };
        return cb(manager);
      });

      const result = await service.submitLeave(
        {
          leaveType: 'ANNUAL_LEAVE',
          startDate: '2025-06-10',
          endDate: '2025-06-15',
          reason: 'Vacation',
        },
        'user-1',
      );

      expect(result.approvalRequest.transactionType).toBe('LEAVE_LONG');
      expect(dataSource.transaction).toHaveBeenCalled();
    });

    it('should throw ERR_LEAVE_002 when insufficient leave balance', async () => {
      const user = createMockUser();
      const employee = { ...createMockEmployee(), annualLeaveBalance: 2 }; // Only 2 days left

      userRepo.findOne.mockResolvedValue(user);
      employeeRepo.findOne.mockResolvedValue(employee);

      await expect(
        service.submitLeave(
          {
            leaveType: 'ANNUAL_LEAVE',
            startDate: '2025-06-10',
            endDate: '2025-06-20', // 11 days requested
            reason: 'Long vacation',
          },
          'user-1',
        ),
      ).rejects.toMatchObject({ errorCode: 'ERR_LEAVE_001' });
    });

    it('should throw ERR_LEAVE_002 when end date is before start date', async () => {
      const user = createMockUser();
      const employee = createMockEmployee();

      userRepo.findOne.mockResolvedValue(user);
      employeeRepo.findOne.mockResolvedValue(employee);

      await expect(
        service.submitLeave(
          {
            leaveType: 'ANNUAL_LEAVE',
            startDate: '2025-06-20',
            endDate: '2025-06-10',
            reason: 'Invalid',
          },
          'user-1',
        ),
      ).rejects.toMatchObject({ errorCode: 'ERR_LEAVE_002' });
    });

    it('should throw ERR_EMPLOYEE_001 when employee not found', async () => {
      const user = createMockUser();

      userRepo.findOne.mockResolvedValue(user);
      employeeRepo.findOne.mockResolvedValue(null);

      await expect(
        service.submitLeave(
          {
            leaveType: 'ANNUAL_LEAVE',
            startDate: '2025-06-10',
            endDate: '2025-06-11',
            reason: 'Personal',
          },
          'user-1',
        ),
      ).rejects.toThrow(BusinessException);
    });
  });

  describe('getMyLeaveRequests', () => {
    it('should return leave requests for the current employee', async () => {
      const employee = { id: 'emp-1', userId: 'user-1' };
      const leaveRequests = [
        {
          id: 'leave-1',
          employeeId: 'emp-1',
          leaveType: 'ANNUAL_LEAVE',
          startDate: new Date('2025-06-10'),
          endDate: new Date('2025-06-11'),
          status: 'PENDING',
        },
        {
          id: 'leave-2',
          employeeId: 'emp-1',
          leaveType: 'SICK_LEAVE',
          startDate: new Date('2025-06-20'),
          endDate: new Date('2025-06-20'),
          status: 'APPROVED',
        },
      ];

      employeeRepo.findOne.mockResolvedValue(employee);
      leaveRepo.find.mockResolvedValue(leaveRequests);

      const result = await service.getMyLeaveRequests('user-1');

      expect(result).toEqual(leaveRequests);
      expect(leaveRepo.find).toHaveBeenCalledWith({
        where: { employeeId: 'emp-1' },
        order: { startDate: 'DESC' },
      });
    });

    it('should return empty array when employee not found', async () => {
      employeeRepo.findOne.mockResolvedValue(null);

      const result = await service.getMyLeaveRequests('unknown-user');

      expect(result).toEqual([]);
    });
  });

  describe('getAllLeaveRequests', () => {
    it('should return all leave requests with employee relation', async () => {
      const leaveRequests = [
        {
          id: 'leave-1',
          employeeId: 'emp-1',
          leaveType: 'ANNUAL_LEAVE',
          status: 'PENDING',
        },
      ];

      leaveRepo.find.mockResolvedValue(leaveRequests);

      const result = await service.getAllLeaveRequests();

      expect(result).toEqual(leaveRequests);
      expect(leaveRepo.find).toHaveBeenCalledWith({
        relations: { employee: true },
        order: { createdAt: 'DESC' },
      });
    });

    it('should return empty array when no leave requests exist', async () => {
      leaveRepo.find.mockResolvedValue([]);

      const result = await service.getAllLeaveRequests();

      expect(result).toEqual([]);
    });
  });

  describe('cancelLeave', () => {
    it('should successfully cancel leave request', async () => {
      const employee = { id: 'emp-1', userId: 'user-1' };
      const leaveRequest = {
        id: 'leave-1',
        employeeId: 'emp-1',
        leaveType: 'ANNUAL_LEAVE',
        status: 'PENDING',
      };
      const cancelledLeave = { ...leaveRequest, status: 'CANCELLED' };

      employeeRepo.findOne.mockResolvedValue(employee);
      leaveRepo.findOne.mockResolvedValue(leaveRequest);
      leaveRepo.save.mockResolvedValue(cancelledLeave);

      const result = await service.cancelLeave('leave-1', 'user-1');

      expect(result.status).toBe('CANCELLED');
      expect(leaveRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'CANCELLED' }),
      );
    });

    it('should throw ERR_UNKNOWN when leave request not found', async () => {
      const employee = { id: 'emp-1', userId: 'user-1' };

      employeeRepo.findOne.mockResolvedValue(employee);
      leaveRepo.findOne.mockResolvedValue(null);

      await expect(service.cancelLeave('unknown-id', 'user-1')).rejects.toThrow(
        BusinessException,
      );
    });

    it('should throw when wrong employee tries to cancel', async () => {
      const currentEmployee = { id: 'emp-1', userId: 'user-1' };
      const leaveRequest = {
        id: 'leave-1',
        employeeId: 'emp-2', // Belongs to other employee
        status: 'PENDING',
      };

      employeeRepo.findOne.mockResolvedValue(currentEmployee);
      leaveRepo.findOne.mockResolvedValue(leaveRequest);

      await expect(service.cancelLeave('leave-1', 'user-1')).rejects.toThrow(
        BusinessException,
      );
    });

    it('should throw when leave request is not PENDING', async () => {
      const employee = { id: 'emp-1', userId: 'user-1' };
      const leaveRequest = {
        id: 'leave-1',
        employeeId: 'emp-1',
        status: 'APPROVED', // Already approved
      };

      employeeRepo.findOne.mockResolvedValue(employee);
      leaveRepo.findOne.mockResolvedValue(leaveRequest);

      await expect(service.cancelLeave('leave-1', 'user-1')).rejects.toThrow(
        BusinessException,
      );
    });
  });

  describe('applyApproved', () => {
    it('should update leave request status to APPROVED', async () => {
      const leaveRequest = {
        id: 'leave-1',
        employeeId: 'emp-1',
        leaveType: 'ANNUAL_LEAVE',
        status: 'PENDING',
      };
      const approvedLeave = { ...leaveRequest, status: 'APPROVED' };

      leaveRepo.findOne.mockResolvedValue(leaveRequest);
      leaveRepo.save.mockResolvedValue(approvedLeave);

      const result = await service.applyApproved('leave-1');

      expect(result.status).toBe('APPROVED');
      expect(leaveRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'APPROVED' }),
      );
    });

    it('should throw when leave request not found', async () => {
      leaveRepo.findOne.mockResolvedValue(null);

      await expect(service.applyApproved('unknown-leave')).rejects.toThrow(
        BusinessException,
      );
    });
  });
});
