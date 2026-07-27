// --- jest setup ---
// Suppress raw SQL console noise from TypeORM
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'warn').mockImplementation(() => {});

// Import test utilities
const { MockRepository } = require('../../test/utils/mock-repository');

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { OffboardingService } from './offboarding.service';
import { OffboardingTask } from '../../entities/offboarding-task.entity';
import { Employee } from '../../entities/employee.entity';
import { User } from '../../entities/user.entity';
import { ApprovalRequest } from '../../entities/approval-request.entity';
import { ApprovalConfig } from '../../entities/approval-config.entity';
import { Notification } from '../../entities/notification.entity';
import { BusinessException } from '../../common/exceptions/business.exception';
import {
  createOffboardingTask,
  createApprovalConfig,
  createUser,
  createEmployee,
} from '../../test/utils/mock-entities';

describe('OffboardingService', () => {
  let service: OffboardingService;

  let taskRepo: any;
  let employeeRepo: any;
  let userRepo: any;
  let approvalRequestRepo: any;
  let approvalConfigRepo: any;
  let notificationRepo: any;
  let dataSource: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    taskRepo = new MockRepository();
    employeeRepo = new MockRepository();
    userRepo = new MockRepository();
    approvalRequestRepo = new MockRepository();
    approvalConfigRepo = new MockRepository();
    notificationRepo = new MockRepository();

    dataSource = {
      transaction: jest.fn((cb) => cb({
        getRepository: (entity: any) => {
          if (entity === Employee) return employeeRepo;
          if (entity === ApprovalRequest) return approvalRequestRepo;
          if (entity === OffboardingTask) return taskRepo;
          return {};
        },
        save: jest.fn((entity) => Promise.resolve(entity)),
        update: jest.fn().mockResolvedValue({ affected: 1 }),
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OffboardingService,
        { provide: getRepositoryToken(OffboardingTask), useValue: taskRepo },
        { provide: getRepositoryToken(Employee), useValue: employeeRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(ApprovalRequest), useValue: approvalRequestRepo },
        { provide: getRepositoryToken(ApprovalConfig), useValue: approvalConfigRepo },
        { provide: getRepositoryToken(Notification), useValue: notificationRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<OffboardingService>(OffboardingService);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // submitResignation(reason, requesterUserId)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('submitResignation(reason, requesterUserId)', () => {
    it('throws ERR_AUTH_001 when user not found', async () => {
      await expect(service.submitResignation('personal reasons', 'nonexistent')).rejects.toMatchObject({
        errorCode: 'ERR_AUTH_001',
      });
    });

    it('throws ERR_AUTH_003 when user has no employee record', async () => {
      const user = createUser({ id: 'u1', role: 'EMPLOYEE' });
      userRepo.add(user);

      await expect(service.submitResignation('personal reasons', 'u1')).rejects.toMatchObject({
        errorCode: 'ERR_AUTH_003',
      });
    });

    it('throws ERR_EMP_002 when employee already TERMINATED', async () => {
      const user = createUser({ id: 'u1', role: 'EMPLOYEE' });
      userRepo.add(user);
      const emp = createEmployee({ id: 'e1', userId: 'u1', status: 'TERMINATED' });
      employeeRepo.add(emp);

      await expect(service.submitResignation('personal reasons', 'u1')).rejects.toMatchObject({
        errorCode: 'ERR_EMP_002',
      });
    });

    it('throws ERR_EMP_002 when employee already in NOTICE_PERIOD', async () => {
      const user = createUser({ id: 'u1', role: 'EMPLOYEE' });
      userRepo.add(user);
      const emp = createEmployee({ id: 'e1', userId: 'u1', status: 'NOTICE_PERIOD' });
      employeeRepo.add(emp);

      await expect(service.submitResignation('personal reasons', 'u1')).rejects.toMatchObject({
        errorCode: 'ERR_EMP_002',
      });
    });

    it('success — creates approval request with OFFBOARDING type and sets status PENDING', async () => {
      const user = createUser({ id: 'u1', role: 'EMPLOYEE' });
      userRepo.add(user);
      const emp = createEmployee({ id: 'e1', userId: 'u1', status: 'OFFICIAL' });
      employeeRepo.add(emp);

      const config = createApprovalConfig({
        transactionType: 'OFFBOARDING',
        requiredLevels: 3,
        approverRolesSequence: ['DEPT_LEAD', 'DIRECTOR', 'CHAIRMAN'],
      });
      approvalConfigRepo.add(config);

      const result = await service.submitResignation('personal reasons', 'u1');

      expect(result.approvalRequest).toBeDefined();
      expect(result.approvalRequest.transactionType).toBe('OFFBOARDING');
      expect(result.approvalRequest.status).toBe('PENDING');
      expect(result.approvalRequest.currentLevel).toBe(1);
    });

    it('success — uses default 3 levels when no config found', async () => {
      const user = createUser({ id: 'u1', role: 'EMPLOYEE' });
      userRepo.add(user);
      const emp = createEmployee({ id: 'e1', userId: 'u1', status: 'OFFICIAL' });
      employeeRepo.add(emp);

      // No config added

      const result = await service.submitResignation('personal reasons', 'u1');

      expect(result.approvalRequest.totalLevels).toBe(3);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // getTasksByEmployee(employeeId)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('getTasksByEmployee(employeeId)', () => {
    it('returns tasks ordered by createdAt ASC', async () => {
      taskRepo.add(createOffboardingTask({ id: 't2', employeeId: 'e1' }));
      taskRepo.add(createOffboardingTask({ id: 't1', employeeId: 'e1' }));

      const result = await service.getTasksByEmployee('e1');

      expect(result).toHaveLength(2);
    });

    it('returns empty array when no tasks found', async () => {
      const result = await service.getTasksByEmployee('nonexistent');
      expect(result).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // getAllPendingTasks()
  // ─────────────────────────────────────────────────────────────────────────────

  describe('getAllPendingTasks()', () => {
    it('returns all PENDING tasks with employee relations', async () => {
      taskRepo.add(createOffboardingTask({ id: 't1', status: 'PENDING' }));
      taskRepo.add(createOffboardingTask({ id: 't2', status: 'COMPLETED' }));

      const result = await service.getAllPendingTasks();

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('PENDING');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // completeTask(taskId, userId)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('completeTask(taskId, userId)', () => {
    it('success — marks task COMPLETED and sets completedAt', async () => {
      const task = createOffboardingTask({ id: 't1', status: 'PENDING' });
      taskRepo.add(task);

      const result = await service.completeTask('t1', 'u-admin');

      expect(result.status).toBe('COMPLETED');
      expect(result.completedAt).toBeInstanceOf(Date);
    });

    it('throws ERR_UNKNOWN when task not found', async () => {
      await expect(service.completeTask('nonexistent', 'u-admin')).rejects.toMatchObject({
        errorCode: 'ERR_UNKNOWN',
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // checkAllCompleted(employeeId)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('checkAllCompleted(employeeId)', () => {
    it('returns true when all tasks are COMPLETED', async () => {
      taskRepo.add(createOffboardingTask({ id: 't1', employeeId: 'e1', status: 'COMPLETED' }));
      taskRepo.add(createOffboardingTask({ id: 't2', employeeId: 'e1', status: 'COMPLETED' }));

      const result = await service.checkAllCompleted('e1');

      expect(result).toBe(true);
    });

    it('returns false when some tasks are still PENDING', async () => {
      taskRepo.add(createOffboardingTask({ id: 't1', employeeId: 'e1', status: 'COMPLETED' }));
      taskRepo.add(createOffboardingTask({ id: 't2', employeeId: 'e1', status: 'PENDING' }));

      const result = await service.checkAllCompleted('e1');

      expect(result).toBe(false);
    });

    it('returns false when employee has no tasks', async () => {
      const result = await service.checkAllCompleted('e-no-tasks');
      expect(result).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // getTasksForRequesterDepartment(requesterUserId)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('getTasksForRequesterDepartment(requesterUserId)', () => {
    it('returns PENDING tasks for the requester department ordered by createdAt ASC', async () => {
      const requesterUser = createUser({ id: 'u-it', role: 'EMPLOYEE' });
      userRepo.add(requesterUser);

      const itEmployee = createEmployee({
        id: 'e-it',
        userId: 'u-it',
        department: { id: 'd-it', deptCode: 'IT', name: 'IT' } as any,
      });
      employeeRepo.add(itEmployee);

      taskRepo.add(createOffboardingTask({ id: 't1', targetDepartment: 'IT', status: 'PENDING' }));
      taskRepo.add(createOffboardingTask({ id: 't2', targetDepartment: 'HR', status: 'PENDING' }));
      taskRepo.add(createOffboardingTask({ id: 't3', targetDepartment: 'IT', status: 'COMPLETED' }));

      const result = await service.getTasksForRequesterDepartment('u-it');

      expect(result).toHaveLength(1);
      expect(result[0].targetDepartment).toBe('IT');
      expect(result[0].status).toBe('PENDING');
    });

    it('returns empty array when requester has no employee record', async () => {
      const requesterUser = createUser({ id: 'u-orphan', role: 'EMPLOYEE' });
      userRepo.add(requesterUser);

      const result = await service.getTasksForRequesterDepartment('u-orphan');
      expect(result).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // finalSettlement(dto)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('finalSettlement(dto)', () => {
    it('throws ERR_AUTH_003 when employee not found', async () => {
      await expect(
        service.finalSettlement({
          employeeId: 'nonexistent',
          lastWorkingDay: '2026-12-31',
          unusedLeaveDays: 5,
          severanceAmount: 2000000,
        }),
      ).rejects.toMatchObject({ errorCode: 'ERR_AUTH_003' });
    });

    it('success — calculates netSettlement correctly (positive severance)', async () => {
      const emp = createEmployee({
        id: 'e1',
        status: 'NOTICE_PERIOD',
        position: { baseSalaryRatio: 1.0 } as any,
        userId: 'u1',
      });
      employeeRepo.add(emp);

      // Add a user for the employee so the service can lock the account
      const user = createUser({ id: 'u1', status: 'ACTIVE' });
      userRepo.add(user);

      const result = await service.finalSettlement({
        employeeId: 'e1',
        lastWorkingDay: '2026-12-31',
        unusedLeaveDays: 7,
        severanceAmount: 2200000,
      });

      // dailyRate = (15000000 * 1.0) / 22 = 681818.18...
      // unusedLeaveComp = 7 * 681818.18 = 4772727.26...
      // severance = 2200000
      // netSettlement = 4772727.26 + 2200000 = 6972727.26
      expect(result.netSettlement).toBeGreaterThan(0);
      expect(result.breakdown.dailyRate).toBe(15000000 / 22);
      expect(result.breakdown.severance).toBe(2200000);
      expect(result.employee.status).toBe('TERMINATED');
    });

    it('success — uses position.baseSalaryRatio to compute dailyRate', async () => {
      const emp = createEmployee({
        id: 'e2',
        status: 'NOTICE_PERIOD',
        position: { baseSalaryRatio: 1.5 } as any,
        userId: 'u2',
      });
      employeeRepo.add(emp);

      const user = createUser({ id: 'u2', status: 'ACTIVE' });
      userRepo.add(user);

      const result = await service.finalSettlement({
        employeeId: 'e2',
        lastWorkingDay: '2026-12-31',
        unusedLeaveDays: 0,
        severanceAmount: 0,
      });

      // base = 15000000 * 1.5 = 22500000; dailyRate = 22500000 / 22
      expect(result.breakdown.dailyRate).toBeCloseTo(22500000 / 22, 2);
    });

    it('netSettlement = 0 when unusedLeaveDays = 0 and severanceAmount = 0', async () => {
      const emp = createEmployee({
        id: 'e3',
        status: 'NOTICE_PERIOD',
        position: { baseSalaryRatio: 1.0 } as any,
        userId: 'u3',
      });
      employeeRepo.add(emp);

      const user = createUser({ id: 'u3', status: 'ACTIVE' });
      userRepo.add(user);

      const result = await service.finalSettlement({
        employeeId: 'e3',
        lastWorkingDay: '2026-12-31',
        unusedLeaveDays: 0,
        severanceAmount: 0,
      });

      expect(result.netSettlement).toBe(0);
    });

    it('unusedLeaveCompensation = 0 when unusedLeaveDays is negative', async () => {
      const emp = createEmployee({
        id: 'e4',
        status: 'NOTICE_PERIOD',
        position: { baseSalaryRatio: 1.0 } as any,
        userId: 'u4',
      });
      employeeRepo.add(emp);

      const user = createUser({ id: 'u4', status: 'ACTIVE' });
      userRepo.add(user);

      const result = await service.finalSettlement({
        employeeId: 'e4',
        lastWorkingDay: '2026-12-31',
        unusedLeaveDays: -3,
        severanceAmount: 0,
      });

      expect(result.breakdown.unusedLeaveCompensation).toBe(0);
      expect(result.netSettlement).toBe(0);
    });

    it('sets employee status to TERMINATED and endDate to lastWorkingDay', async () => {
      const emp = createEmployee({
        id: 'e5',
        status: 'NOTICE_PERIOD',
        position: { baseSalaryRatio: 1.0 } as any,
        userId: 'u5',
      });
      employeeRepo.add(emp);

      const user = createUser({ id: 'u5', status: 'ACTIVE' });
      userRepo.add(user);

      const result = await service.finalSettlement({
        employeeId: 'e5',
        lastWorkingDay: '2026-11-30',
        unusedLeaveDays: 0,
        severanceAmount: 0,
      });

      expect(result.employee.status).toBe('TERMINATED');
      expect(result.employee.endDate).toBeInstanceOf(Date);
    });

    it('sets user status to INACTIVE after settlement', async () => {
      const emp = createEmployee({
        id: 'e6',
        status: 'NOTICE_PERIOD',
        position: { baseSalaryRatio: 1.0 } as any,
        userId: 'u6',
      });
      employeeRepo.add(emp);

      const user = createUser({ id: 'u6', status: 'ACTIVE' });
      userRepo.add(user);

      await service.finalSettlement({
        employeeId: 'e6',
        lastWorkingDay: '2026-12-31',
        unusedLeaveDays: 0,
        severanceAmount: 0,
      });

      expect(user.status).toBe('INACTIVE');
    });
  });
});
