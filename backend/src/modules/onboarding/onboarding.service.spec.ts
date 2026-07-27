// --- jest setup ---
// Suppress raw SQL console noise from TypeORM
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'warn').mockImplementation(() => {});

// Import test utilities
const { MockRepository } = require('../../test/utils/mock-repository');

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OnboardingService } from './onboarding.service';
import { OnboardingTask } from '../../entities/onboarding-task.entity';
import { Employee } from '../../entities/employee.entity';
import { User } from '../../entities/user.entity';
import { JobHistory } from '../../entities/job-history.entity';
import { Notification } from '../../entities/notification.entity';
import { BusinessException } from '../../common/exceptions/business.exception';
import {
  createOnboardingTask,
  createUser,
  createEmployee,
} from '../../test/utils/mock-entities';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('OnboardingService', () => {
  let service: OnboardingService;

  let taskRepo: any;
  let employeeRepo: any;
  let userRepo: any;
  let notificationRepo: any;
  let jobHistoryRepo: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    taskRepo = new MockRepository();
    employeeRepo = new MockRepository();
    userRepo = new MockRepository();
    notificationRepo = new MockRepository();
    jobHistoryRepo = new MockRepository();

    // Default findOne that uses the repository's data store
    // Note: MockRepository has its own findOne that searches internal data
    // We need to capture the created employee after transaction commits
    let capturedEmployee: any = null;

    employeeRepo.findOne = jest.fn().mockImplementation(async (opts: any) => {
      // After transaction commits, return the captured employee for email lookup
      if (capturedEmployee && opts?.where?.email === capturedEmployee.email) {
        return capturedEmployee;
      }
      const where = opts?.where;
      if (!where) return employeeRepo.getAll()[0] ?? null;
      if (where.userId) {
        return employeeRepo.getAll().find((e: any) => e.userId === where.userId) ?? null;
      }
      if (where.email) {
        return employeeRepo.getAll().find((e: any) => e.email === where.email) ?? null;
      }
      if (where.id) {
        return employeeRepo.getAll().find((e: any) => e.id === where.id) ?? null;
      }
      return null;
    });
    userRepo.findOne = jest.fn().mockImplementation(async (opts: any) => {
      const where = opts?.where;
      if (!where) return userRepo.getAll()[0] ?? null;
      if (where.id) {
        return userRepo.getAll().find((u: any) => u.id === where.id) ?? null;
      }
      if (where.username) {
        return userRepo.getAll().find((u: any) => u.username === where.username) ?? null;
      }
      return null;
    });

    // Mock manager for transaction support in createEmployeeAndUser
    let saveCallCount = 0;
    const mockQueryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        save: jest.fn().mockImplementation((entity) => {
          saveCallCount++;
          if (saveCallCount === 1) {
            // User saved
            return Promise.resolve({ ...entity, id: entity.id ?? 'u-new' });
          } else {
            // Employee saved - capture it for later re-fetch
            const savedEmployee = {
              ...entity,
              id: entity.id ?? 'e-new',
              empCode: 'EMP001',
              email: entity.email ?? 'johndoe@example.com',
              fullName: entity.fullName ?? 'John Doe',
              status: 'ONBOARDING',
            };
            capturedEmployee = savedEmployee;
            // Also add to the repository's internal data
            employeeRepo.add(savedEmployee);
            return Promise.resolve(savedEmployee);
          }
        }),
        connection: { createQueryRunner: jest.fn().mockReturnValue(null) },
      },
    };
    mockQueryRunner.manager.connection.createQueryRunner = jest.fn().mockReturnValue(mockQueryRunner);

    (employeeRepo as any).manager = {
      connection: {
        createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnboardingService,
        { provide: getRepositoryToken(OnboardingTask), useValue: taskRepo },
        { provide: getRepositoryToken(Employee), useValue: employeeRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Notification), useValue: notificationRepo },
        { provide: getRepositoryToken(JobHistory), useValue: jobHistoryRepo },
      ],
    }).compile();

    service = module.get<OnboardingService>(OnboardingService);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // initiateOnboarding(dto, requesterUserId)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('initiateOnboarding(dto, requesterUserId)', () => {
    it('throws ERR_AUTH_001 when requester user not found', async () => {
      await expect(
        service.initiateOnboarding(
          { employee: { fullName: 'John', email: 'john@test.com', dob: '1995-01-15' } } as any,
          'nonexistent',
        ),
      ).rejects.toMatchObject({ errorCode: 'ERR_AUTH_001' });
    });

    it('throws ERR_EMP_001 when existing employee with same email found', async () => {
      const requesterUser = createUser({ id: 'u-hr', role: 'ADMIN' });
      userRepo.add(requesterUser);

      const existing = createEmployee({ id: 'e-existing', email: 'john@test.com' });
      employeeRepo.add(existing);

      await expect(
        service.initiateOnboarding(
          { employee: { fullName: 'John', email: 'john@test.com', dob: '1995-01-15' } } as any,
          'u-hr',
        ),
      ).rejects.toMatchObject({ errorCode: 'ERR_EMP_001' });
    });

    it('success — creates employee with ONBOARDING status and 4 default tasks when dto.employee provided', async () => {
      const requesterUser = createUser({ id: 'u-hr', role: 'ADMIN' });
      userRepo.add(requesterUser);

      // No existing email
      (bcrypt.hash as jest.Mock).mockResolvedValue('placeholder-hash');

      const result = await service.initiateOnboarding(
        {
          employee: {
            fullName: 'John Doe',
            email: 'johndoe@example.com',
            dob: '1995-01-15',
            phone: '0909123456',
            gender: 'MALE',
            departmentId: 'd1',
            positionId: 'p1',
          },
        } as any,
        'u-hr',
      );

      expect(result.employee).toBeDefined();
      expect(result.tasks).toHaveLength(4);
      // Default tasks: HR documentation, IT setup, ADMIN admin, HR probation review
      const taskTitles = result.tasks.map((t: any) => t.taskTitle);
      expect(taskTitles.some((t: string) => t.includes('Hồ sơ') || t.includes('HĐLĐ'))).toBe(true);
      expect(taskTitles.some((t: string) => t.includes('máy tính') || t.includes('Email'))).toBe(true);
      // Hash password thuần: `<username>@Temp` (không ghép empCode/dob)
      const hashCalls = (bcrypt.hash as jest.Mock).mock.calls;
      expect(hashCalls.length).toBeGreaterThan(0);
      const [hashedPassword, rounds] = hashCalls[0];
      expect(hashedPassword).toMatch(/.+@Temp$/);
      expect(rounds).toBe(10);
    });

    it('success — uses existing employee when dto.employeeId provided', async () => {
      const requesterUser = createUser({ id: 'u-hr', role: 'ADMIN' });
      userRepo.add(requesterUser);

      const existingEmp = createEmployee({
        id: 'e-existing',
        email: 'existing@test.com',
        status: 'OFFICIAL',
      });
      employeeRepo.add(existingEmp);

      const result = await service.initiateOnboarding(
        { employeeId: 'e-existing' } as any,
        'u-hr',
      );

      expect(result.employee.id).toBe('e-existing');
      expect(result.tasks).toHaveLength(4);
    });

    it('throws ERR_AUTH_003 when employeeId not found', async () => {
      const requesterUser = createUser({ id: 'u-hr', role: 'ADMIN' });
      userRepo.add(requesterUser);

      await expect(
        service.initiateOnboarding({ employeeId: 'nonexistent' } as any, 'u-hr'),
      ).rejects.toMatchObject({ errorCode: 'ERR_AUTH_003' });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // assignTask(taskId, dto, requesterUserId)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('assignTask(taskId, dto, requesterUserId)', () => {
    it('success — assigns task to self when selfAssign=true', async () => {
      const requesterUser = createUser({ id: 'u-it', role: 'EMPLOYEE' });
      userRepo.add(requesterUser);

      const itEmployee = createEmployee({ id: 'e-it', userId: 'u-it' });
      employeeRepo.add(itEmployee);

      const task = createOnboardingTask({ id: 't1', status: 'PENDING', targetDepartment: 'IT' });
      taskRepo.add(task);

      const result = await service.assignTask(
        't1',
        { selfAssign: true },
        'u-it',
      );

      expect(result.assigneeId).toBe('e-it');
      expect(result.status).toBe('IN_PROGRESS');
    });

    it('success — assigns task to specific assignee when assigneeId provided', async () => {
      const requesterUser = createUser({ id: 'u-hr', role: 'ADMIN' });
      userRepo.add(requesterUser);

      const task = createOnboardingTask({ id: 't1', status: 'PENDING' });
      taskRepo.add(task);

      const result = await service.assignTask(
        't1',
        { assigneeId: 'e-target' },
        'u-hr',
      );

      expect(result.assigneeId).toBe('e-target');
      expect(result.status).toBe('IN_PROGRESS');
    });

    it('throws ERR_UNKNOWN when task not found', async () => {
      const requesterUser = createUser({ id: 'u-hr', role: 'ADMIN' });
      userRepo.add(requesterUser);

      await expect(
        service.assignTask('nonexistent', { selfAssign: true }, 'u-hr'),
      ).rejects.toMatchObject({ errorCode: 'ERR_UNKNOWN' });
    });

    it('throws ERR_AUTH_003 when selfAssign but requester has no employee record', async () => {
      const requesterUser = createUser({ id: 'u-orphan', role: 'EMPLOYEE' });
      userRepo.add(requesterUser);

      const task = createOnboardingTask({ id: 't1' });
      taskRepo.add(task);

      await expect(
        service.assignTask('t1', { selfAssign: true }, 'u-orphan'),
      ).rejects.toMatchObject({ errorCode: 'ERR_AUTH_003' });
    });

    it('throws ERR_APPROVAL_004 when neither assigneeId nor selfAssign provided', async () => {
      const requesterUser = createUser({ id: 'u-hr', role: 'ADMIN' });
      userRepo.add(requesterUser);

      const task = createOnboardingTask({ id: 't1' });
      taskRepo.add(task);

      await expect(
        service.assignTask('t1', {} as any, 'u-hr'),
      ).rejects.toMatchObject({ errorCode: 'ERR_APPROVAL_004' });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // completeTask(taskId, userId)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('completeTask(taskId, userId)', () => {
    it('success — marks task COMPLETED', async () => {
      const requesterUser = createUser({ id: 'u-it', role: 'EMPLOYEE' });
      userRepo.add(requesterUser);

      const itEmployee = createEmployee({
        id: 'e-it',
        userId: 'u-it',
        department: { id: 'd-it', deptCode: 'IT', name: 'IT' } as any,
      });
      employeeRepo.add(itEmployee);

      const task = createOnboardingTask({
        id: 't1',
        status: 'PENDING',
        targetDepartment: 'IT',
        employeeId: 'e-new',
      });
      taskRepo.add(task);

      const result = await service.completeTask('t1', 'u-it');

      expect(result.status).toBe('COMPLETED');
      expect(result.completedAt).toBeInstanceOf(Date);
    });

    it('throws ERR_AUTH_001 when user not found', async () => {
      await expect(service.completeTask('t1', 'nonexistent')).rejects.toMatchObject({
        errorCode: 'ERR_AUTH_001',
      });
    });

    it('throws ERR_UNKNOWN when task not found', async () => {
      const requesterUser = createUser({ id: 'u-it', role: 'EMPLOYEE' });
      userRepo.add(requesterUser);

      await expect(service.completeTask('nonexistent', 'u-it')).rejects.toMatchObject({
        errorCode: 'ERR_UNKNOWN',
      });
    });

    it('throws ERR_APPROVAL_002 when task already completed', async () => {
      const requesterUser = createUser({ id: 'u-it', role: 'EMPLOYEE' });
      userRepo.add(requesterUser);

      const task = createOnboardingTask({ id: 't1', status: 'COMPLETED' });
      taskRepo.add(task);

      await expect(service.completeTask('t1', 'u-it')).rejects.toMatchObject({
        errorCode: 'ERR_APPROVAL_002',
      });
    });

    it('throws ERR_AUTH_002 when user department does not match task targetDepartment', async () => {
      const requesterUser = createUser({ id: 'u-hr', role: 'EMPLOYEE' });
      userRepo.add(requesterUser);

      const hrEmployee = createEmployee({
        id: 'e-hr',
        userId: 'u-hr',
        department: { id: 'd-hr', deptCode: 'HR', name: 'HR' } as any,
      });
      employeeRepo.add(hrEmployee);

      const task = createOnboardingTask({
        id: 't1',
        status: 'PENDING',
        targetDepartment: 'IT',
        employeeId: 'e-new',
      });
      taskRepo.add(task);

      await expect(service.completeTask('t1', 'u-hr')).rejects.toMatchObject({
        errorCode: 'ERR_AUTH_002',
      });
    });

    it('ADMIN can complete any task regardless of department', async () => {
      const adminUser = createUser({ id: 'u-admin', role: 'ADMIN' });
      userRepo.add(adminUser);

      const task = createOnboardingTask({
        id: 't1',
        status: 'PENDING',
        targetDepartment: 'IT',
        employeeId: 'e-new',
      });
      taskRepo.add(task);

      const result = await service.completeTask('t1', 'u-admin');

      expect(result.status).toBe('COMPLETED');
    });

    it('auto-promotes employee to OFFICIAL when all tasks are completed', async () => {
      const adminUser = createUser({ id: 'u-admin', role: 'ADMIN' });
      userRepo.add(adminUser);

      // Task to complete
      taskRepo.add(createOnboardingTask({ id: 't1', status: 'PENDING', employeeId: 'e-new' }));

      // Already completed other tasks
      taskRepo.add(createOnboardingTask({ id: 't2', status: 'COMPLETED', employeeId: 'e-new' }));

      // The employee starts as ONBOARDING
      employeeRepo.add(createEmployee({ id: 'e-new', status: 'ONBOARDING' }));

      await service.completeTask('t1', 'u-admin');

      // Employee should be promoted to OFFICIAL
      const emp = await employeeRepo.findOne({ where: { id: 'e-new' } });
      expect(emp.status).toBe('OFFICIAL');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // promoteToOfficial(employeeId)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('promoteToOfficial(employeeId)', () => {
    it('success — promotes ONBOARDING employee to OFFICIAL', async () => {
      const emp = createEmployee({ id: 'e-new', status: 'ONBOARDING' });
      employeeRepo.add(emp);

      const result = await service.promoteToOfficial('e-new');

      expect(result.status).toBe('OFFICIAL');
    });

    it('success — promotes PROBATION employee to OFFICIAL', async () => {
      const emp = createEmployee({ id: 'e-probation', status: 'PROBATION' });
      employeeRepo.add(emp);

      const result = await service.promoteToOfficial('e-probation');

      expect(result.status).toBe('OFFICIAL');
    });

    it('throws ERR_AUTH_003 when employee not found', async () => {
      await expect(service.promoteToOfficial('nonexistent')).rejects.toMatchObject({
        errorCode: 'ERR_AUTH_003',
      });
    });

    it('throws ERR_EMP_001 when employee already OFFICIAL', async () => {
      const emp = createEmployee({ id: 'e-official', status: 'OFFICIAL' });
      employeeRepo.add(emp);

      await expect(service.promoteToOfficial('e-official')).rejects.toMatchObject({
        errorCode: 'ERR_EMP_001',
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // getDashboard()
  // ─────────────────────────────────────────────────────────────────────────────

  describe('getDashboard()', () => {
    it('returns correct pendingByDepartment counts and recentOnboardings', async () => {
      // Add pending tasks for different departments
      taskRepo.add(createOnboardingTask({ id: 't1', status: 'PENDING', targetDepartment: 'HR' }));
      taskRepo.add(createOnboardingTask({ id: 't2', status: 'PENDING', targetDepartment: 'HR' }));
      taskRepo.add(createOnboardingTask({ id: 't3', status: 'PENDING', targetDepartment: 'IT' }));
      taskRepo.add(createOnboardingTask({ id: 't4', status: 'COMPLETED', targetDepartment: 'HR' }));

      // Add onboarding/probation employees
      employeeRepo.add(createEmployee({ id: 'e1', status: 'ONBOARDING' }));
      employeeRepo.add(createEmployee({ id: 'e2', status: 'PROBATION' }));

      const result = await service.getDashboard();

      expect(result.pendingByDepartment.HR).toBe(2);
      expect(result.pendingByDepartment.IT).toBe(1);
      expect(result.recentOnboardings).toHaveLength(2);
    });

    it('returns zero counts when no pending tasks', async () => {
      const result = await service.getDashboard();

      expect(result.pendingByDepartment.HR).toBe(0);
      expect(result.pendingByDepartment.IT).toBe(0);
      expect(result.pendingByDepartment.ADMIN).toBe(0);
      expect(result.recentOnboardings).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // getTasksForDepartment(department)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('getTasksForDepartment(department)', () => {
    it('returns only PENDING tasks for the given department ordered by dueDate ASC', async () => {
      taskRepo.add(createOnboardingTask({ id: 't1', status: 'PENDING', targetDepartment: 'IT' }));
      taskRepo.add(createOnboardingTask({ id: 't2', status: 'COMPLETED', targetDepartment: 'IT' }));
      taskRepo.add(createOnboardingTask({ id: 't3', status: 'PENDING', targetDepartment: 'HR' }));

      const result = await service.getTasksForDepartment('IT');

      expect(result).toHaveLength(1);
      expect(result[0].targetDepartment).toBe('IT');
      expect(result[0].status).toBe('PENDING');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // getAllPendingTasks()
  // ─────────────────────────────────────────────────────────────────────────────

  describe('getAllPendingTasks()', () => {
    it('returns all PENDING tasks ordered by createdAt ASC', async () => {
      taskRepo.add(createOnboardingTask({ id: 't1', status: 'COMPLETED' }));
      taskRepo.add(createOnboardingTask({ id: 't2', status: 'PENDING' }));
      taskRepo.add(createOnboardingTask({ id: 't3', status: 'PENDING' }));

      const result = await service.getAllPendingTasks();

      expect(result).toHaveLength(2);
      expect(result.every((t) => t.status === 'PENDING')).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // getTasksByEmployee(employeeId)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('getTasksByEmployee(employeeId)', () => {
    it('returns all tasks for the employee ordered by createdAt ASC', async () => {
      taskRepo.add(createOnboardingTask({ id: 't1', employeeId: 'e1' }));
      taskRepo.add(createOnboardingTask({ id: 't2', employeeId: 'e2' }));
      taskRepo.add(createOnboardingTask({ id: 't3', employeeId: 'e1' }));

      const result = await service.getTasksByEmployee('e1');

      expect(result).toHaveLength(2);
      expect(result.every((t) => t.employeeId === 'e1')).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // updateTaskStatus(taskId, status, requesterUserId)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('updateTaskStatus(taskId, status, requesterUserId)', () => {
    it('success — assignee can update task status to IN_PROGRESS', async () => {
      const requesterUser = createUser({ id: 'u-it', role: 'EMPLOYEE' });
      userRepo.add(requesterUser);

      const itEmployee = createEmployee({ id: 'e-it', userId: 'u-it' });
      employeeRepo.add(itEmployee);

      const task = createOnboardingTask({
        id: 't1',
        status: 'PENDING',
        assigneeId: 'e-it',
      });
      taskRepo.add(task);

      const result = await service.updateTaskStatus('t1', 'IN_PROGRESS', 'u-it');

      expect(result.status).toBe('IN_PROGRESS');
    });

    it('success — assignee can mark task COMPLETED', async () => {
      const requesterUser = createUser({ id: 'u-it', role: 'EMPLOYEE' });
      userRepo.add(requesterUser);

      const itEmployee = createEmployee({ id: 'e-it', userId: 'u-it' });
      employeeRepo.add(itEmployee);

      const task = createOnboardingTask({
        id: 't1',
        status: 'IN_PROGRESS',
        assigneeId: 'e-it',
      });
      taskRepo.add(task);

      const result = await service.updateTaskStatus('t1', 'COMPLETED', 'u-it');

      expect(result.status).toBe('COMPLETED');
      expect(result.completedAt).toBeInstanceOf(Date);
    });

    it('success — ADMIN can update any task status', async () => {
      const adminUser = createUser({ id: 'u-admin', role: 'ADMIN' });
      userRepo.add(adminUser);

      const task = createOnboardingTask({ id: 't1', status: 'PENDING' });
      taskRepo.add(task);

      const result = await service.updateTaskStatus('t1', 'IN_PROGRESS', 'u-admin');

      expect(result.status).toBe('IN_PROGRESS');
    });

    it('throws ERR_UNKNOWN when task not found', async () => {
      const requesterUser = createUser({ id: 'u-it', role: 'EMPLOYEE' });
      userRepo.add(requesterUser);

      await expect(
        service.updateTaskStatus('nonexistent', 'IN_PROGRESS', 'u-it'),
      ).rejects.toMatchObject({ errorCode: 'ERR_UNKNOWN' });
    });

    it('throws ERR_AUTH_002 when neither admin nor assignee', async () => {
      const requesterUser = createUser({ id: 'u-it', role: 'EMPLOYEE' });
      userRepo.add(requesterUser);

      const itEmployee = createEmployee({ id: 'e-it', userId: 'u-it' });
      employeeRepo.add(itEmployee);

      const task = createOnboardingTask({
        id: 't1',
        status: 'PENDING',
        assigneeId: 'e-other',
      });
      taskRepo.add(task);

      await expect(
        service.updateTaskStatus('t1', 'IN_PROGRESS', 'u-it'),
      ).rejects.toMatchObject({ errorCode: 'ERR_AUTH_002' });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // checkAllCompleted(employeeId)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('checkAllCompleted(employeeId)', () => {
    it('returns true when all tasks are COMPLETED', async () => {
      taskRepo.add(createOnboardingTask({ id: 't1', employeeId: 'e1', status: 'COMPLETED' }));
      taskRepo.add(createOnboardingTask({ id: 't2', employeeId: 'e1', status: 'COMPLETED' }));

      const result = await service.checkAllCompleted('e1');

      expect(result).toBe(true);
    });

    it('returns false when some tasks are still PENDING', async () => {
      taskRepo.add(createOnboardingTask({ id: 't1', employeeId: 'e1', status: 'COMPLETED' }));
      taskRepo.add(createOnboardingTask({ id: 't2', employeeId: 'e1', status: 'PENDING' }));

      const result = await service.checkAllCompleted('e1');

      expect(result).toBe(false);
    });

    it('returns false when employee has no tasks', async () => {
      const result = await service.checkAllCompleted('e-no-tasks');
      expect(result).toBe(false);
    });
  });
});
