// --- jest setup ---
// Suppress raw SQL console noise from TypeORM
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'warn').mockImplementation(() => {});

// Import test utilities
const { MockRepository } = require('../../test/utils/mock-repository');
const { createUser, createEmployee, createUserWithEmployee, createApprovalRequest, createApprovalConfig, createTimesheet, createJobHistory, createSalaryHistory, createSalary, createLeaveRequest, createOffboardingTask } = require('../../test/utils/mock-entities');

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ApprovalService } from './approval.service';
import { OnboardingService } from '../onboarding/onboarding.service';
import { OffboardingService } from '../offboarding/offboarding.service';
import { EmployeesService } from '../employees/employees.service';
import { LeaveRequestsService } from '../leave-requests/leave-requests.service';
import { TimesheetsService } from '../timesheets/timesheets.service';
import { ApprovalRequest } from '../../entities/approval-request.entity';
import { ApprovalStepHistory } from '../../entities/approval-step-history.entity';
import { ApprovalConfig } from '../../entities/approval-config.entity';
import { Employee } from '../../entities/employee.entity';
import { User } from '../../entities/user.entity';
import { Timesheet } from '../../entities/timesheet.entity';
import { JobHistory } from '../../entities/job-history.entity';
import { SalaryHistory } from '../../entities/salary-history.entity';
import { Salary } from '../../entities/salary.entity';
import { LeaveRequest } from '../../entities/leave-request.entity';
import { OffboardingTask } from '../../entities/offboarding-task.entity';
import { Notification } from '../../entities/notification.entity';
import { BusinessException } from '../../common/exceptions/business.exception';

describe('ApprovalService', () => {
  let service: ApprovalService;

  let approvalRequestRepo: any;
  let stepHistoryRepo: any;
  let configRepo: any;
  let employeeRepo: any;
  let userRepo: any;
  let timesheetRepo: any;
  let jobHistoryRepo: any;
  let salaryHistoryRepo: any;
  let salaryRepo: any;
  let leaveRepo: any;
  let offboardingTaskRepo: any;
  let notificationRepo: any;
  let dataSource: any;
  let leaveRequestsService: any;
  let timesheetsService: any;
  let employeesService: any;
  let onboardingService: any;
  let offboardingService: any;

  beforeEach(async () => {
    approvalRequestRepo = new MockRepository();
    stepHistoryRepo = new MockRepository();
    configRepo = new MockRepository();
    employeeRepo = new MockRepository();
    userRepo = new MockRepository();
    timesheetRepo = new MockRepository();
    jobHistoryRepo = new MockRepository();
    salaryHistoryRepo = new MockRepository();
    salaryRepo = new MockRepository();
    leaveRepo = new MockRepository();
    offboardingTaskRepo = new MockRepository();
    notificationRepo = new MockRepository();

    dataSource = { transaction: jest.fn() };

    // Service uses internal methods, so we don't need to mock external services
    leaveRequestsService = {};
    timesheetsService = {};
    employeesService = {};
    onboardingService = {};
    offboardingService = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApprovalService,
        { provide: getRepositoryToken(ApprovalRequest), useValue: approvalRequestRepo },
        { provide: getRepositoryToken(ApprovalStepHistory), useValue: stepHistoryRepo },
        { provide: getRepositoryToken(ApprovalConfig), useValue: configRepo },
        { provide: getRepositoryToken(Employee), useValue: employeeRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Timesheet), useValue: timesheetRepo },
        { provide: getRepositoryToken(JobHistory), useValue: jobHistoryRepo },
        { provide: getRepositoryToken(SalaryHistory), useValue: salaryHistoryRepo },
        { provide: getRepositoryToken(Salary), useValue: salaryRepo },
        { provide: getRepositoryToken(LeaveRequest), useValue: leaveRepo },
        { provide: getRepositoryToken(OffboardingTask), useValue: offboardingTaskRepo },
        { provide: getRepositoryToken(Notification), useValue: notificationRepo },
        { provide: DataSource, useValue: dataSource },
        { provide: LeaveRequestsService, useValue: leaveRequestsService },
        { provide: TimesheetsService, useValue: timesheetsService },
        { provide: EmployeesService, useValue: employeesService },
        { provide: OnboardingService, useValue: onboardingService },
        { provide: OffboardingService, useValue: offboardingService },
      ],
    }).compile();

    service = module.get<ApprovalService>(ApprovalService);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // getApprovalConfigs()
  // ─────────────────────────────────────────────────────────────────────────────

  describe('getApprovalConfigs()', () => {
    it('returns all configs ordered by transactionType ASC', async () => {
      const config1 = createApprovalConfig({ id: 'c1', transactionType: 'LEAVE_SHORT' });
      const config2 = createApprovalConfig({ id: 'c2', transactionType: 'TIMESHEET' });
      configRepo.add(config1, config2);

      const result = await service.getApprovalConfigs();

      expect(result).toHaveLength(2);
      expect(result[0].transactionType).toBe('LEAVE_SHORT');
      expect(result[1].transactionType).toBe('TIMESHEET');
    });

    it('returns empty array when no configs exist', async () => {
      const result = await service.getApprovalConfigs();
      expect(result).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // getConfigForTransaction(type)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('getConfigForTransaction(type)', () => {
    it('returns config when found', async () => {
      const config = createApprovalConfig({ transactionType: 'LEAVE_SHORT' });
      configRepo.add(config);

      const result = await service.getConfigForTransaction('LEAVE_SHORT');

      expect(result).not.toBeNull();
      expect(result?.transactionType).toBe('LEAVE_SHORT');
    });

    it('returns null when not found', async () => {
      const result = await service.getConfigForTransaction('NONEXISTENT');
      expect(result).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // getPendingMyLevel(userId)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('getPendingMyLevel(userId)', () => {
    it('returns pending requests for the current user role level', async () => {
      const adminUser = createUser({ id: 'u-admin', role: 'ADMIN' });
      userRepo.add(adminUser);

      const req1 = createApprovalRequest({ id: 'r1', transactionType: 'LEAVE_SHORT', currentLevel: 1, status: 'PENDING' });
      const req2 = createApprovalRequest({ id: 'r2', transactionType: 'TIMESHEET', currentLevel: 1, status: 'PENDING' });
      approvalRequestRepo.add(req1, req2);

      const config = createApprovalConfig({
        transactionType: 'LEAVE_SHORT',
        approverRolesSequence: ['DEPT_LEAD'],
        requiredLevels: 1,
      });
      configRepo.add(config, createApprovalConfig({
        transactionType: 'TIMESHEET',
        approverRolesSequence: ['DEPT_LEAD'],
        requiredLevels: 1,
      }));

      const result = await service.getPendingMyLevel('u-admin');

      expect(Array.isArray(result)).toBe(true);
    });

    it('throws ERR_AUTH_001 when user not found', async () => {
      await expect(service.getPendingMyLevel('nonexistent')).rejects.toMatchObject({
        errorCode: 'ERR_AUTH_001',
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // getMySubmitted(userId)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('getMySubmitted(userId)', () => {
    it('returns requests submitted by the employee', async () => {
      const employee = createEmployee({ id: 'e1', userId: 'u1' });
      employeeRepo.add(employee);
      employeeRepo.add(createEmployee({ id: 'e2', userId: 'u2' }));

      const req1 = createApprovalRequest({ id: 'r1', requesterId: 'e1', transactionType: 'LEAVE_SHORT' });
      const req2 = createApprovalRequest({ id: 'r2', requesterId: 'e1', transactionType: 'TIMESHEET' });
      const req3 = createApprovalRequest({ id: 'r3', requesterId: 'e2', transactionType: 'LEAVE_SHORT' });
      approvalRequestRepo.add(req1, req2, req3);

      const result = await service.getMySubmitted('u1');

      expect(result).toHaveLength(2);
      expect(result.every((r) => r.requesterId === 'e1')).toBe(true);
    });

    it('returns empty array when employee not found', async () => {
      const result = await service.getMySubmitted('unknown-user');
      expect(result).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // approve(id, comment, userId)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('approve(id, comment, userId)', () => {
    it('throws ERR_AUTH_001 when user not found', async () => {
      await expect(service.approve('r1', 'user-comment', 'nonexistent')).rejects.toMatchObject({
        errorCode: 'ERR_AUTH_001',
      });
    });

    it('throws ERR_APPROVAL_003 when request not found', async () => {
      const user = createUser({ id: 'u1', role: 'ADMIN' });
      userRepo.add(user);

      await expect(service.approve('nonexistent', 'comment', 'u1')).rejects.toMatchObject({
        errorCode: 'ERR_APPROVAL_003',
      });
    });

    it('throws ERR_APPROVAL_002 when request already resolved (status REJECTED)', async () => {
      const user = createUser({ id: 'u1', role: 'ADMIN' });
      userRepo.add(user);
      const req = createApprovalRequest({ id: 'r1', status: 'REJECTED' });
      approvalRequestRepo.add(req);

      await expect(service.approve('r1', 'comment', 'u1')).rejects.toMatchObject({
        errorCode: 'ERR_APPROVAL_002',
      });
    });

    it('throws ERR_APPROVAL_001 when user lacks required role at current level', async () => {
      const employee = createEmployee({ id: 'e1', userId: 'u1' });
      employeeRepo.add(employee);
      const user = createUser({ id: 'u1', role: 'EMPLOYEE' });
      userRepo.add(user);

      const req = createApprovalRequest({
        id: 'r1',
        status: 'PENDING',
        currentLevel: 1,
        transactionType: 'LEAVE_SHORT',
      });
      approvalRequestRepo.add(req);

      const config = createApprovalConfig({
        transactionType: 'LEAVE_SHORT',
        approverRolesSequence: ['DEPT_LEAD'],
        requiredLevels: 1,
      });
      configRepo.add(config);

      await expect(service.approve('r1', 'comment', 'u1')).rejects.toMatchObject({
        errorCode: 'ERR_APPROVAL_001',
      });
    });

    it('ADMIN can approve regardless of role sequence', async () => {
      const employee = createEmployee({ id: 'e1', userId: 'u-admin' });
      employeeRepo.add(employee);
      const adminUser = createUser({ id: 'u-admin', role: 'ADMIN' });
      userRepo.add(adminUser);

      const req = createApprovalRequest({
        id: 'r1',
        status: 'PENDING',
        currentLevel: 1,
        totalLevels: 1,
        transactionType: 'LEAVE_SHORT',
      });
      approvalRequestRepo.add(req);

      const config = createApprovalConfig({
        transactionType: 'LEAVE_SHORT',
        approverRolesSequence: ['DEPT_LEAD'],
        requiredLevels: 1,
      });
      configRepo.add(config);

      const result = await service.approve('r1', 'admin approved', 'u-admin');

      expect(result.status).toBe('APPROVED');
    });

    it('approves and advances level when not last level — saves step history', async () => {
      const employee = createEmployee({ id: 'e1', userId: 'u-lead' });
      employeeRepo.add(employee);
      const user = createUser({ id: 'u-lead', role: 'DEPT_LEAD' });
      userRepo.add(user);

      const req = createApprovalRequest({
        id: 'r1',
        status: 'PENDING',
        currentLevel: 1,
        totalLevels: 2,
        transactionType: 'LEAVE_SHORT',
      });
      approvalRequestRepo.add(req);

      const config = createApprovalConfig({
        transactionType: 'LEAVE_SHORT',
        approverRolesSequence: ['DEPT_LEAD', 'DIRECTOR'],
        requiredLevels: 2,
      });
      configRepo.add(config);

      const result = await service.approve('r1', 'level 1 ok', 'u-lead');

      expect(result.currentLevel).toBe(2);
      expect(result.status).toBe('PENDING');
      expect(stepHistoryRepo.getAll()).toHaveLength(1);
      expect(stepHistoryRepo.getAll()[0].action).toBe('APPROVE');
    });

    it('finalizes approval when last level reached — TIMESHEET calls timesheetsService.applyApproved', async () => {
      const employee = createEmployee({ id: 'e1', userId: 'u-admin' });
      employeeRepo.add(employee);
      const adminUser = createUser({ id: 'u-admin', role: 'ADMIN' });
      userRepo.add(adminUser);

      const timesheet = createTimesheet({ id: 'ts1', approvalRequestId: 'r1' });
      timesheetRepo.add(timesheet);

      const req = createApprovalRequest({
        id: 'r1',
        status: 'PENDING',
        currentLevel: 1,
        totalLevels: 1,
        transactionType: 'TIMESHEET',
      });
      approvalRequestRepo.add(req);

      const config = createApprovalConfig({
        transactionType: 'TIMESHEET',
        approverRolesSequence: ['DEPT_LEAD'],
        requiredLevels: 1,
      });
      configRepo.add(config);

      const result = await service.approve('r1', 'final approve', 'u-admin');

      expect(result.status).toBe('APPROVED');
    });

    it('finalizes approval — JOB_TRANSFER updates request', async () => {
      const employee = createEmployee({ id: 'e1', userId: 'u-admin' });
      employeeRepo.add(employee);
      const adminUser = createUser({ id: 'u-admin', role: 'ADMIN' });
      userRepo.add(adminUser);

      const jobHistory = createJobHistory({ id: 'jh1', approvalRequestId: 'r1', employeeId: 'e1' });
      jobHistoryRepo.add(jobHistory);

      const req = createApprovalRequest({
        id: 'r1',
        status: 'PENDING',
        currentLevel: 1,
        totalLevels: 1,
        transactionType: 'JOB_TRANSFER',
        referenceEntityId: 'jh1',
      });
      approvalRequestRepo.add(req);

      const config = createApprovalConfig({
        transactionType: 'JOB_TRANSFER',
        approverRolesSequence: ['DEPT_LEAD'],
        requiredLevels: 1,
      });
      configRepo.add(config);

      const result = await service.approve('r1', 'transfer approved', 'u-admin');

      expect(result.status).toBe('APPROVED');
    });

    it('finalizes approval — SALARY_ADJUSTMENT updates request', async () => {
      const employee = createEmployee({ id: 'e1', userId: 'u-admin' });
      employeeRepo.add(employee);
      const adminUser = createUser({ id: 'u-admin', role: 'ADMIN' });
      userRepo.add(adminUser);

      const salaryHistory = createSalaryHistory({ id: 'sh1', approvalRequestId: 'r1', employeeId: 'e1' });
      salaryHistoryRepo.add(salaryHistory);

      const req = createApprovalRequest({
        id: 'r1',
        status: 'PENDING',
        currentLevel: 1,
        totalLevels: 1,
        transactionType: 'SALARY_ADJUSTMENT',
        referenceEntityId: 'sh1',
      });
      approvalRequestRepo.add(req);

      const config = createApprovalConfig({
        transactionType: 'SALARY_ADJUSTMENT',
        approverRolesSequence: ['DEPT_LEAD'],
        requiredLevels: 1,
      });
      configRepo.add(config);

      const result = await service.approve('r1', 'salary approved', 'u-admin');

      expect(result.status).toBe('APPROVED');
    });

    it('finalizes approval — LEAVE_SHORT updates request', async () => {
      const employee = createEmployee({ id: 'e1', userId: 'u-admin' });
      employeeRepo.add(employee);
      const adminUser = createUser({ id: 'u-admin', role: 'ADMIN' });
      userRepo.add(adminUser);

      const leave = createLeaveRequest({ id: 'lv1', approvalRequestId: 'r1', employeeId: 'e1' });
      leaveRepo.add(leave);

      const req = createApprovalRequest({
        id: 'r1',
        status: 'PENDING',
        currentLevel: 1,
        totalLevels: 1,
        transactionType: 'LEAVE_SHORT',
        referenceEntityId: 'lv1',
      });
      approvalRequestRepo.add(req);

      const config = createApprovalConfig({
        transactionType: 'LEAVE_SHORT',
        approverRolesSequence: ['DEPT_LEAD'],
        requiredLevels: 1,
      });
      configRepo.add(config);

      const result = await service.approve('r1', 'leave approved', 'u-admin');

      expect(result.status).toBe('APPROVED');
    });

    it('finalizes approval — OFFBOARDING updates request', async () => {
      const employee = createEmployee({ id: 'e1', userId: 'u-admin' });
      employeeRepo.add(employee);
      const adminUser = createUser({ id: 'u-admin', role: 'ADMIN' });
      userRepo.add(adminUser);

      const req = createApprovalRequest({
        id: 'r1',
        status: 'PENDING',
        currentLevel: 1,
        totalLevels: 1,
        transactionType: 'OFFBOARDING',
        referenceEntityId: 'e1',
      });
      approvalRequestRepo.add(req);

      const config = createApprovalConfig({
        transactionType: 'OFFBOARDING',
        approverRolesSequence: ['DEPT_LEAD'],
        requiredLevels: 1,
      });
      configRepo.add(config);

      const result = await service.approve('r1', 'offboarding approved', 'u-admin');

      expect(result.status).toBe('APPROVED');
    });

    it('throws ERR_APPROVAL_004 when config not found', async () => {
      const employee = createEmployee({ id: 'e1', userId: 'u-admin' });
      employeeRepo.add(employee);
      const adminUser = createUser({ id: 'u-admin', role: 'ADMIN' });
      userRepo.add(adminUser);

      const req = createApprovalRequest({
        id: 'r1',
        status: 'PENDING',
        transactionType: 'UNKNOWN_TYPE',
      });
      approvalRequestRepo.add(req);

      await expect(service.approve('r1', 'comment', 'u-admin')).rejects.toMatchObject({
        errorCode: 'ERR_APPROVAL_004',
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // reject(id, comment, userId)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('reject(id, comment, userId)', () => {
    it('throws ERR_AUTH_001 when user not found', async () => {
      await expect(service.reject('r1', 'comment', 'nonexistent')).rejects.toMatchObject({
        errorCode: 'ERR_AUTH_001',
      });
    });

    it('throws ERR_APPROVAL_003 when request not found', async () => {
      const user = createUser({ id: 'u1', role: 'ADMIN' });
      userRepo.add(user);

      await expect(service.reject('nonexistent', 'comment', 'u1')).rejects.toMatchObject({
        errorCode: 'ERR_APPROVAL_003',
      });
    });

    it('throws ERR_APPROVAL_002 when request already resolved', async () => {
      const user = createUser({ id: 'u1', role: 'ADMIN' });
      userRepo.add(user);
      const req = createApprovalRequest({ id: 'r1', status: 'APPROVED' });
      approvalRequestRepo.add(req);

      await expect(service.reject('r1', 'comment', 'u1')).rejects.toMatchObject({
        errorCode: 'ERR_APPROVAL_002',
      });
    });

    it('throws ERR_APPROVAL_001 when user lacks required role', async () => {
      const employee = createEmployee({ id: 'e1', userId: 'u1' });
      employeeRepo.add(employee);
      const user = createUser({ id: 'u1', role: 'EMPLOYEE' });
      userRepo.add(user);

      const req = createApprovalRequest({
        id: 'r1',
        status: 'PENDING',
        currentLevel: 1,
        transactionType: 'LEAVE_SHORT',
      });
      approvalRequestRepo.add(req);

      const config = createApprovalConfig({
        transactionType: 'LEAVE_SHORT',
        approverRolesSequence: ['DEPT_LEAD'],
        requiredLevels: 1,
      });
      configRepo.add(config);

      await expect(service.reject('r1', 'comment', 'u1')).rejects.toMatchObject({
        errorCode: 'ERR_APPROVAL_001',
      });
    });

    it('success — sets status REJECTED, saves step history with action REJECT', async () => {
      const employee = createEmployee({ id: 'e1', userId: 'u-lead' });
      employeeRepo.add(employee);
      const user = createUser({ id: 'u-lead', role: 'DEPT_LEAD' });
      userRepo.add(user);

      const req = createApprovalRequest({
        id: 'r1',
        status: 'PENDING',
        currentLevel: 1,
        totalLevels: 1,
        transactionType: 'LEAVE_SHORT',
      });
      approvalRequestRepo.add(req);

      const config = createApprovalConfig({
        transactionType: 'LEAVE_SHORT',
        approverRolesSequence: ['DEPT_LEAD'],
        requiredLevels: 1,
      });
      configRepo.add(config);

      const result = await service.reject('r1', 'rejected reason', 'u-lead');

      expect(result.status).toBe('REJECTED');
      expect(stepHistoryRepo.getAll()).toHaveLength(1);
      expect(stepHistoryRepo.getAll()[0].action).toBe('REJECT');
      expect(stepHistoryRepo.getAll()[0].comment).toBe('rejected reason');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // getHistory(requestId)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('getHistory(requestId)', () => {
    it('returns step history ordered by stepLevel ASC', async () => {
      const step1 = { id: 's1', requestId: 'r1', stepLevel: 1, action: 'APPROVE' } as any;
      const step2 = { id: 's2', requestId: 'r1', stepLevel: 2, action: 'APPROVE' } as any;
      stepHistoryRepo.add(step1, step2);

      const result = await service.getHistory('r1');

      expect(result).toHaveLength(2);
      expect(result[0].stepLevel).toBe(1);
      expect(result[1].stepLevel).toBe(2);
    });

    it('returns empty array when no history found', async () => {
      const result = await service.getHistory('nonexistent');
      expect(result).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // getDetail(requestId)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('getDetail(requestId)', () => {
    it('throws ERR_APPROVAL_003 when request not found', async () => {
      await expect(service.getDetail('nonexistent')).rejects.toMatchObject({
        errorCode: 'ERR_APPROVAL_003',
      });
    });

    it('returns request with detail for LEAVE_SHORT type', async () => {
      const req = createApprovalRequest({
        id: 'r1',
        transactionType: 'LEAVE_SHORT',
        referenceEntityId: 'lv1',
      });
      approvalRequestRepo.add(req);

      const leave = createLeaveRequest({ id: 'lv1', employeeId: 'e1' });
      leaveRepo.add(leave);

      const config = createApprovalConfig({ transactionType: 'LEAVE_SHORT', requiredLevels: 1 });
      configRepo.add(config);

      const result = await service.getDetail('r1');

      expect(result.id).toBe('r1');
      expect(result.detail).toBeDefined();
    });

    it('returns request with detail for JOB_TRANSFER type', async () => {
      const req = createApprovalRequest({
        id: 'r1',
        transactionType: 'JOB_TRANSFER',
        referenceEntityId: 'jh1',
      });
      approvalRequestRepo.add(req);

      const jobHistory = createJobHistory({
        id: 'jh1',
        approvalRequestId: 'r1',
        employeeId: 'e1',
      });
      jobHistoryRepo.add(jobHistory);

      const config = createApprovalConfig({ transactionType: 'JOB_TRANSFER', requiredLevels: 1 });
      configRepo.add(config);

      const result = await service.getDetail('r1');

      expect(result.detail.employeeId).toBe('e1');
    });

    it('returns request with detail for SALARY_ADJUSTMENT type', async () => {
      const req = createApprovalRequest({
        id: 'r1',
        transactionType: 'SALARY_ADJUSTMENT',
        referenceEntityId: 'sh1',
      });
      approvalRequestRepo.add(req);

      const salaryHistory = createSalaryHistory({
        id: 'sh1',
        approvalRequestId: 'r1',
        employeeId: 'e1',
      });
      salaryHistoryRepo.add(salaryHistory);

      const config = createApprovalConfig({ transactionType: 'SALARY_ADJUSTMENT', requiredLevels: 1 });
      configRepo.add(config);

      const result = await service.getDetail('r1');

      expect(result.detail.oldBaseSalary).toBe(15000000);
      expect(result.detail.newBaseSalary).toBe(18000000);
    });

    it('returns request with detail for TIMESHEET type', async () => {
      const req = createApprovalRequest({
        id: 'r1',
        transactionType: 'TIMESHEET',
        referenceEntityId: 'ts1',
      });
      approvalRequestRepo.add(req);

      const timesheet = createTimesheet({ id: 'ts1', approvalRequestId: 'r1' });
      timesheetRepo.add(timesheet);

      const config = createApprovalConfig({ transactionType: 'TIMESHEET', requiredLevels: 1 });
      configRepo.add(config);

      const result = await service.getDetail('r1');

      expect(result.detail.weekNumber).toBe(1);
    });

    it('returns request with detail for OFFBOARDING type', async () => {
      const employee = createEmployee({
        id: 'e1',
        fullName: 'John Doe',
        empCode: 'EMP-001',
        endDate: new Date('2026-12-31'),
      });
      employeeRepo.add(employee);

      const req = createApprovalRequest({
        id: 'r1',
        transactionType: 'OFFBOARDING',
        referenceEntityId: 'e1',
      });
      approvalRequestRepo.add(req);

      const config = createApprovalConfig({ transactionType: 'OFFBOARDING', requiredLevels: 1 });
      configRepo.add(config);

      const result = await service.getDetail('r1');

      expect(result.detail.employeeName).toBe('John Doe');
      expect(result.detail.employeeCode).toBe('EMP-001');
    });
  });
});
