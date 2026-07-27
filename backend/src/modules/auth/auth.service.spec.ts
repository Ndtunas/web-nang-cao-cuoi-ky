// --- jest setup ---
// Suppress raw SQL console noise from TypeORM
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'warn').mockImplementation(() => {});

// Import test utilities
const { MockRepository } = require('../../test/utils/mock-repository');
const { createUser, createEmployee } = require('../../test/utils/mock-entities');

import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import { User } from '../../entities/user.entity';
import { Employee } from '../../entities/employee.entity';
import { ApprovalRequest } from '../../entities/approval-request.entity';
import { ApprovalStepHistory } from '../../entities/approval-step-history.entity';
import { BusinessException } from '../../common/exceptions/business.exception';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: any;
  let employeeRepo: any;
  let approvalRequestRepo: any;
  let approvalStepHistoryRepo: any;
  let jwtService: any;
  let dataSource: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    // Mock bcrypt
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
    jest.spyOn(bcrypt, 'hash').mockResolvedValue('$2b$10$hashed' as never);

    userRepo = new MockRepository();
    employeeRepo = new MockRepository();
    approvalRequestRepo = new MockRepository();
    approvalStepHistoryRepo = new MockRepository();

    jwtService = {
      sign: jest.fn().mockReturnValue('signed-token'),
      verify: jest.fn(),
    };

    dataSource = {
      transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Employee), useValue: employeeRepo },
        { provide: getRepositoryToken(ApprovalRequest), useValue: approvalRequestRepo },
        { provide: getRepositoryToken(ApprovalStepHistory), useValue: approvalStepHistoryRepo },
        { provide: JwtService, useValue: jwtService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // login()
  // -------------------------------------------------------------------------
  describe('login()', () => {
    it('should return tokens and user info on successful login', async () => {
      const mockUser = createUser({ id: 'user-1', username: 'johndoe', status: 'ACTIVE' });
      mockUser.passwordHash = '$2b$10$hashedpassword';

      userRepo.add(mockUser);
      employeeRepo.add(createEmployee({ id: 'emp-1', userId: 'user-1', empCode: 'EMP001', dob: '1990-01-01' }));

      const result = await service.login({ username: 'johndoe', password: 'Password123!' });

      expect(result.accessToken).toBe('signed-token');
      expect(result.user.username).toBe('johndoe');
    });

    it('should throw ERR_AUTH_001 when user is not found', async () => {
      await expect(service.login({ username: 'nobody', password: 'pass' }))
        .rejects.toMatchObject({ errorCode: 'ERR_AUTH_001' });
    });

    it('should throw ERR_AUTH_001 when user is inactive', async () => {
      const inactiveUser = createUser({ id: 'user-1', username: 'johndoe', status: 'INACTIVE' });
      userRepo.add(inactiveUser);

      await expect(service.login({ username: 'johndoe', password: 'pass' }))
        .rejects.toMatchObject({ errorCode: 'ERR_AUTH_001' });
    });
  });

  // -------------------------------------------------------------------------
  // changePassword()
  // -------------------------------------------------------------------------
  describe('changePassword()', () => {
    it('should succeed when old password matches', async () => {
      const mockUser = createUser({ id: 'user-1' });
      mockUser.passwordHash = '$2b$10$oldhash';
      userRepo.add(mockUser);
      employeeRepo.add(createEmployee({ id: 'emp-1', userId: 'user-1', empCode: 'EMP001', dob: '1990-01-01' }));

      const result = await service.changePassword('user-1', {
        oldPassword: 'OldPass123!',
        newPassword: 'NewPass123!',
      });

      expect(result.success).toBe(true);
    });

    it('should throw ERR_AUTH_001 when user not found', async () => {
      await expect(
        service.changePassword('nonexistent', {
          oldPassword: 'OldPass123!',
          newPassword: 'NewPass123!',
        }),
      ).rejects.toMatchObject({ errorCode: 'ERR_AUTH_001' });
    });
  });

  // -------------------------------------------------------------------------
  // requestPasswordReset()
  // -------------------------------------------------------------------------
  describe('requestPasswordReset()', () => {
    it('should allow ADMIN to reset password directly', async () => {
      const adminUser = createUser({ id: 'admin-1', role: 'ADMIN' });
      const targetUser = createUser({ id: 'target-1', role: 'EMPLOYEE' });
      targetUser.passwordHash = '$2b$10$oldhash';

      userRepo.add(targetUser);

      const result = await service.requestPasswordReset(adminUser, {
        targetUserId: 'target-1',
        newPassword: 'NewPass123!',
      });

      expect(result.success).toBe(true);
    });

    it('should create approval request when HR DEPT_LEAD requests reset', async () => {
      const hrLeadUser = createUser({ id: 'hr-lead-1', role: 'DEPT_LEAD' });
      const targetUser = createUser({ id: 'target-1', role: 'EMPLOYEE' });
      const hrEmployee = createEmployee({
        id: 'hr-emp-1',
        userId: 'hr-lead-1',
        department: { id: 'hr-dept', deptCode: 'HR', name: 'HR' } as any,
      });

      userRepo.add(targetUser);
      userRepo.add(hrLeadUser);
      employeeRepo.add(hrEmployee);

      const result = await service.requestPasswordReset(hrLeadUser, {
        targetUserId: 'target-1',
        newPassword: 'NewPass123!',
      });

      expect(result.success).toBe(true);
    });

    it('should throw ERR_AUTH_003 when target user not found', async () => {
      const adminUser = createUser({ id: 'admin-1', role: 'ADMIN' });

      await expect(
        service.requestPasswordReset(adminUser, {
          targetUserId: 'nonexistent',
          newPassword: 'NewPass123!',
        }),
      ).rejects.toMatchObject({ errorCode: 'ERR_AUTH_003' });
    });
  });

  // -------------------------------------------------------------------------
  // approvePasswordReset()
  // -------------------------------------------------------------------------
  describe('approvePasswordReset()', () => {
    it('should throw ERR_AUTH_002 when non-ADMIN tries to approve', async () => {
      const employeeUser = createUser({ id: 'emp-1', role: 'EMPLOYEE' });

      await expect(
        service.approvePasswordReset(employeeUser, 'approval-req-1'),
      ).rejects.toMatchObject({ errorCode: 'ERR_AUTH_002' });
    });

    it('should throw ERR_APPROVAL_003 when approval request not found', async () => {
      const adminUser = createUser({ id: 'admin-1', role: 'ADMIN' });

      await expect(
        service.approvePasswordReset(adminUser, 'nonexistent'),
      ).rejects.toMatchObject({ errorCode: 'ERR_APPROVAL_003' });
    });

    it('should throw ERR_APPROVAL_002 when approval request already resolved', async () => {
      const adminUser = createUser({ id: 'admin-1', role: 'ADMIN' });
      const resolvedRequest = {
        id: 'approval-1',
        transactionType: 'RESET_PASSWORD',
        status: 'APPROVED',
        referenceEntityId: 'target-1:hash',
      };
      approvalRequestRepo.add(resolvedRequest);

      await expect(
        service.approvePasswordReset(adminUser, 'approval-1'),
      ).rejects.toMatchObject({ errorCode: 'ERR_APPROVAL_002' });
    });

    it('should throw ERR_APPROVAL_004 when transaction type is invalid', async () => {
      const adminUser = createUser({ id: 'admin-1', role: 'ADMIN' });
      const wrongTypeRequest = {
        id: 'approval-1',
        transactionType: 'LEAVE_SHORT',
        status: 'PENDING',
        referenceEntityId: 'target-1:hash',
      };
      approvalRequestRepo.add(wrongTypeRequest);

      await expect(
        service.approvePasswordReset(adminUser, 'approval-1'),
      ).rejects.toMatchObject({ errorCode: 'ERR_APPROVAL_004' });
    });
  });

  // -------------------------------------------------------------------------
  // refresh()
  // -------------------------------------------------------------------------
  describe('refresh()', () => {
    it('should return new accessToken when refresh token is valid', async () => {
      const mockUser = createUser({ id: 'user-1', status: 'ACTIVE', refreshToken: 'valid-refresh-token' });
      const tokenPayload = { sub: 'user-1', rnd: 0.123 };

      jwtService.verify.mockReturnValue(tokenPayload);
      userRepo.add(mockUser);

      const result = await service.refresh('valid-refresh-token');

      expect(result.accessToken).toBe('signed-token');
    });

    it('should throw ERR_AUTH_001 when refresh token is invalid', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refresh('invalid-token'))
        .rejects.toMatchObject({ errorCode: 'ERR_AUTH_001' });
    });

    it('should throw ERR_AUTH_001 when user is inactive', async () => {
      const inactiveUser = createUser({ id: 'user-1', status: 'INACTIVE', refreshToken: 'valid-refresh-token' });
      const tokenPayload = { sub: 'user-1', rnd: 0.123 };

      jwtService.verify.mockReturnValue(tokenPayload);
      userRepo.add(inactiveUser);

      await expect(service.refresh('valid-refresh-token'))
        .rejects.toMatchObject({ errorCode: 'ERR_AUTH_001' });
    });
  });

  // -------------------------------------------------------------------------
  // logout()
  // -------------------------------------------------------------------------
  describe('logout()', () => {
    it('should succeed without error when user exists', async () => {
      const mockUser = createUser({ id: 'user-1' });
      userRepo.add(mockUser);

      const result = await service.logout('user-1');

      expect(result.success).toBe(true);
    });

    it('should succeed without error when user does not exist', async () => {
      const result = await service.logout('nonexistent');

      expect(result.success).toBe(true);
    });
  });
});
