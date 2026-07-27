// --- jest setup ---
// Suppress raw SQL console noise from TypeORM
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'warn').mockImplementation(() => {});

// Mock bcrypt globally for all tests in this suite
jest.mock('bcrypt', () => ({ hash: jest.fn().mockResolvedValue('hashed-pw') }));

import { Test, TestingModule } from '@nestjs/testing';
import { EmployeesService } from './employees.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MockRepository } from '../../test/utils/mock-repository';
import {
  createUser,
  createEmployee,
  createDepartment,
  createPosition,
  createJobHistory,
  createSalaryHistory,
  createApprovalRequest,
  createApprovalConfig,
} from '../../test/utils/mock-entities';
import { Employee } from '../../entities/employee.entity';
import { User } from '../../entities/user.entity';
import { Department } from '../../entities/department.entity';
import { Position } from '../../entities/position.entity';
import { JobHistory } from '../../entities/job-history.entity';
import { SalaryHistory } from '../../entities/salary-history.entity';
import { ApprovalRequest } from '../../entities/approval-request.entity';
import { ApprovalConfig } from '../../entities/approval-config.entity';
import { BusinessException } from '../../common/exceptions/business.exception';
import { TransactionType, EmployeeStatus } from '../../common/enums/business-values';
import * as bcrypt from 'bcrypt';

describe('EmployeesService', () => {
  let service: EmployeesService;
  let employeeRepo: MockRepository;
  let userRepo: MockRepository;
  let departmentRepo: MockRepository;
  let positionRepo: MockRepository;
  let jobHistoryRepo: MockRepository;
  let salaryHistoryRepo: MockRepository;
  let approvalRequestRepo: MockRepository;
  let approvalConfigRepo: MockRepository;

  beforeEach(async () => {
    employeeRepo = new MockRepository();
    userRepo = new MockRepository();
    departmentRepo = new MockRepository();
    positionRepo = new MockRepository();
    jobHistoryRepo = new MockRepository();
    salaryHistoryRepo = new MockRepository();
    approvalRequestRepo = new MockRepository();
    approvalConfigRepo = new MockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeesService,
        { provide: getRepositoryToken(Employee), useValue: employeeRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Department), useValue: departmentRepo },
        { provide: getRepositoryToken(Position), useValue: positionRepo },
        { provide: getRepositoryToken(JobHistory), useValue: jobHistoryRepo },
        { provide: getRepositoryToken(SalaryHistory), useValue: salaryHistoryRepo },
        { provide: getRepositoryToken(ApprovalRequest), useValue: approvalRequestRepo },
        { provide: getRepositoryToken(ApprovalConfig), useValue: approvalConfigRepo },
      ],
    }).compile();

    service = module.get<EmployeesService>(EmployeesService);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // findAll()
  // ─────────────────────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('returns employees with relations', async () => {
      const emp1 = createEmployee({ id: 'e1', empCode: 'EMP-001' });
      const emp2 = createEmployee({ id: 'e2', empCode: 'EMP-002' });
      employeeRepo.add(emp1, emp2);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // getStats()
  // ─────────────────────────────────────────────────────────────────────────────

  describe('getStats()', () => {
    it('returns all stat fields correctly', async () => {
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const dept = createDepartment({ id: 'd1', name: 'IT' });
      departmentRepo.add(dept);

      employeeRepo.add(
        createEmployee({ id: 'e1', status: 'OFFICIAL', department: dept, joinDate: thisMonth }),
        createEmployee({ id: 'e2', status: 'PROBATION', department: dept, joinDate: thisMonth }),
        createEmployee({ id: 'e3', status: 'NOTICE_PERIOD', department: dept }),
        createEmployee({ id: 'e4', status: 'TERMINATED', department: dept }),
      );

      const stats = await service.getStats();

      expect(stats.totalEmployees).toBe(4);
      expect(stats.activeEmployees).toBe(2);
      expect(stats.onLeave).toBe(1);
      expect(stats.newHires).toBe(2);
      expect(stats.departments).toContainEqual(
        expect.objectContaining({ name: 'IT', count: 4 }),
      );
    });

    it('handles empty employees', async () => {
      const stats = await service.getStats();

      expect(stats.totalEmployees).toBe(0);
      expect(stats.activeEmployees).toBe(0);
      expect(stats.onLeave).toBe(0);
      expect(stats.newHires).toBe(0);
      expect(stats.departments).toHaveLength(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // create()
  // ─────────────────────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('success — creates employee and user, empCode generated', async () => {
      // Simulate empCode generated by DB: after save, empCode is populated
      employeeRepo.setMockImpl((method, opts) => {
        if (method === 'save') {
          const emp = opts as any;
          if (!emp.empCode) {
            emp.empCode = 'EMP-001';
          }
          employeeRepo.add(emp);
          return emp;
        }
        if (method === 'findOne') {
          if (opts?.where?.id) return employeeRepo.getAll().find((e: any) => e.id === opts.where.id) ?? null;
          return null;
        }
        return null;
      });

      const dto = {
        fullName: 'Jane Doe',
        email: 'jane@example.com',
        phone: '0909123456',
        gender: 'FEMALE',
        dob: '1995-01-15',
        joinDate: '2026-01-01',
        departmentId: 'd1',
        positionId: 'p1',
      };

      const result = await service.create(dto);

      expect(result.fullName).toBe('Jane Doe');
      expect(result.empCode).toBe('EMP-001');
      expect(userRepo.getAll().length).toBe(1);
      expect(employeeRepo.getAll().length).toBe(1);
      // hash chỉ từ password thuần: username + "@Temp" (không ghép empCode/dob)
      expect(bcrypt.hash).toHaveBeenCalledWith('jane@Temp', 10);
    });

    it('duplicate email — throws ERR_EMP_001', async () => {
      employeeRepo.add(createEmployee({ email: 'existing@example.com' }));

      await expect(
        service.create({ email: 'existing@example.com', fullName: 'Dup' }),
      ).rejects.toMatchObject({ errorCode: 'ERR_EMP_001' });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // updatePersonalInfo()
  // ─────────────────────────────────────────────────────────────────────────────

  describe('updatePersonalInfo()', () => {
    it('success', async () => {
      const emp = createEmployee({ id: 'e1', email: 'old@example.com' });
      employeeRepo.add(emp);

      employeeRepo.setMockImpl((method, opts) => {
        if (method === 'findOne') {
          const id = opts?.where?.id;
          return employeeRepo.getAll().find((e: any) => e.id === id) ?? null;
        }
        return null;
      });

      const result = await service.updatePersonalInfo('e1', {
        phone: '999888777',
        address: 'New Address',
      });

      expect(result.phone).toBe('999888777');
      expect(result.address).toBe('New Address');
    });

    it('employee not found — throws ERR_AUTH_003', async () => {
      await expect(
        service.updatePersonalInfo('nonexistent', { phone: '123' }),
      ).rejects.toMatchObject({ errorCode: 'ERR_AUTH_003' });
    });

    it('duplicate email on update — throws ERR_EMP_001', async () => {
      employeeRepo.add(
        createEmployee({ id: 'e1', email: 'a@example.com' }),
        createEmployee({ id: 'e2', email: 'b@example.com' }),
      );

      employeeRepo.setMockImpl((method, opts) => {
        if (method === 'findOne') {
          if (opts?.where?.id) {
            return employeeRepo.getAll().find((e: any) => e.id === opts.where.id) ?? null;
          }
          if (opts?.where?.email) {
            return employeeRepo.getAll().find((e: any) => e.email === opts.where.email) ?? null;
          }
          return null;
        }
        return null;
      });

      await expect(
        service.updatePersonalInfo('e1', { email: 'b@example.com' }),
      ).rejects.toMatchObject({ errorCode: 'ERR_EMP_001' });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // submitJobTransfer()
  // ─────────────────────────────────────────────────────────────────────────────

  describe('submitJobTransfer()', () => {
    it('success — creates approval request + job history', async () => {
      const requester = createEmployee({ id: 'e-req', userId: 'u-req' });
      const employee = createEmployee({ id: 'e1', userId: 'u1', status: 'OFFICIAL', departmentId: 'd-old' });
      employeeRepo.add(requester, employee);

      approvalConfigRepo.add(createApprovalConfig({ transactionType: TransactionType.JOB_TRANSFER, requiredLevels: 2 }));

      const result = await service.submitJobTransfer(
        {
          employeeId: 'e1',
          newDepartmentId: 'd-new',
          newPositionId: 'p-new',
          effectiveDate: '2026-03-01',
        },
        'u-req',
      );

      expect(result.jobHistory).toBeDefined();
      expect(result.approvalRequest).toBeDefined();
      expect(result.approvalRequest.transactionType).toBe(TransactionType.JOB_TRANSFER);
      expect(result.approvalRequest.status).toBe('PENDING');
      expect(result.jobHistory.oldDepartmentId).toBe('d-old');
      expect(result.jobHistory.newDepartmentId).toBe('d-new');
    });

    it('employee not found — throws ERR_AUTH_003', async () => {
      const requester = createEmployee({ id: 'e-req', userId: 'u-req' });
      employeeRepo.add(requester);

      await expect(
        service.submitJobTransfer({ employeeId: 'nonexistent', newDepartmentId: 'd1', newPositionId: 'p1' }, 'u-req'),
      ).rejects.toMatchObject({ errorCode: 'ERR_AUTH_003' });
    });

    it('NOTICE_PERIOD employee — throws ERR_EMP_002', async () => {
      const requester = createEmployee({ id: 'e-req', userId: 'u-req' });
      const emp = createEmployee({ id: 'e1', userId: 'u1', status: 'NOTICE_PERIOD' });
      employeeRepo.add(requester, emp);

      await expect(
        service.submitJobTransfer({ employeeId: 'e1', newDepartmentId: 'd-new', newPositionId: 'p-new' }, 'u-req'),
      ).rejects.toMatchObject({ errorCode: 'ERR_EMP_002' });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // submitSalaryAdjustment()
  // ─────────────────────────────────────────────────────────────────────────────

  describe('submitSalaryAdjustment()', () => {
    it('success', async () => {
      const requester = createEmployee({ id: 'e-req', userId: 'u-req' });
      const employee = createEmployee({ id: 'e1', userId: 'u1', positionId: 'p1' });
      employeeRepo.add(requester, employee);

      positionRepo.add(createPosition({ id: 'p1', baseSalaryRatio: 1.2 }));

      approvalConfigRepo.add(createApprovalConfig({ transactionType: TransactionType.SALARY_ADJUSTMENT, requiredLevels: 3 }));

      const result = await service.submitSalaryAdjustment(
        { employeeId: 'e1', newBaseSalary: '20000000', newRatio: '1.5' },
        'u-req',
      );

      expect(result.salaryHistory).toBeDefined();
      expect(result.salaryHistory.newBaseSalary).toBe(20000000);
      expect(result.approvalRequest).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // getJobHistory()
  // ─────────────────────────────────────────────────────────────────────────────

  describe('getJobHistory()', () => {
    it('success', async () => {
      employeeRepo.add(createEmployee({ id: 'e1' }));
      const history = createJobHistory({ employeeId: 'e1' });
      jobHistoryRepo.add(history);

      const result = await service.getJobHistory('e1');

      expect(result).toHaveLength(1);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // getSalaryHistory()
  // ─────────────────────────────────────────────────────────────────────────────

  describe('getSalaryHistory()', () => {
    it('success', async () => {
      employeeRepo.add(createEmployee({ id: 'e1' }));
      const salary = createSalaryHistory({ employeeId: 'e1' });
      salaryHistoryRepo.add(salary);

      const result = await service.getSalaryHistory('e1');

      expect(result).toHaveLength(1);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // submitDisciplineReward()
  // ─────────────────────────────────────────────────────────────────────────────

  describe('submitDisciplineReward()', () => {
    it('success', async () => {
      const requester = createEmployee({ id: 'e-req', userId: 'u-req' });
      const employee = createEmployee({ id: 'e1', fullName: 'John Doe' });
      employeeRepo.add(requester, employee);

      approvalConfigRepo.add(createApprovalConfig({ transactionType: TransactionType.DISCIPLINE_REWARD, requiredLevels: 3 }));

      const result = await service.submitDisciplineReward(
        { employeeId: 'e1', type: 'REWARD', amount: 500000 },
        'u-req',
      );

      expect(result.approvalRequest).toBeDefined();
      expect(result.approvalRequest.transactionType).toBe(TransactionType.DISCIPLINE_REWARD);
      expect(result.message).toContain('khen thưởng');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // promoteToOfficial()
  // ─────────────────────────────────────────────────────────────────────────────

  describe('promoteToOfficial()', () => {
    it('ONBOARDING→OFFICIAL', async () => {
      const emp = createEmployee({ id: 'e1', status: 'ONBOARDING' });
      employeeRepo.add(emp);

      employeeRepo.setMockImpl((method, opts) => {
        if (method === 'findOne') {
          const id = opts?.where?.id;
          return employeeRepo.getAll().find((e: any) => e.id === id) ?? null;
        }
        return null;
      });

      const result = await service.promoteToOfficial('e1');

      expect(result.status).toBe('OFFICIAL');
    });

    it('PROBATION→OFFICIAL', async () => {
      const emp = createEmployee({ id: 'e2', status: 'PROBATION' });
      employeeRepo.add(emp);

      employeeRepo.setMockImpl((method, opts) => {
        if (method === 'findOne') {
          const id = opts?.where?.id;
          return employeeRepo.getAll().find((e: any) => e.id === id) ?? null;
        }
        return null;
      });

      const result = await service.promoteToOfficial('e2');

      expect(result.status).toBe('OFFICIAL');
    });

    it('already OFFICIAL — throws ERR_EMP_001', async () => {
      const emp = createEmployee({ id: 'e3', status: 'OFFICIAL' });
      employeeRepo.add(emp);

      await expect(service.promoteToOfficial('e3')).rejects.toMatchObject({
        errorCode: 'ERR_EMP_001',
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // terminateEmployee()
  // ─────────────────────────────────────────────────────────────────────────────

  describe('terminateEmployee()', () => {
    it('success — sets TERMINATED, disables user', async () => {
      const user = createUser({ id: 'u1', status: 'ACTIVE' });
      const emp = createEmployee({ id: 'e1', userId: 'u1', status: 'OFFICIAL' });
      userRepo.add(user);
      employeeRepo.add(emp);

      employeeRepo.setMockImpl((method, opts) => {
        if (method === 'findOne') {
          const id = opts?.where?.id;
          return employeeRepo.getAll().find((e: any) => e.id === id) ?? null;
        }
        if (method === 'save') {
          return { ...opts, status: 'TERMINATED' };
        }
        return null;
      });

      const result = await service.terminateEmployee('e1');

      expect(result.status).toBe('TERMINATED');
      expect(result.endDate).toBeDefined();
      expect(user.status).toBe('INACTIVE');
    });

    it('not found — throws ERR_AUTH_003', async () => {
      await expect(service.terminateEmployee('nonexistent')).rejects.toMatchObject({
        errorCode: 'ERR_AUTH_003',
      });
    });
  });
});
