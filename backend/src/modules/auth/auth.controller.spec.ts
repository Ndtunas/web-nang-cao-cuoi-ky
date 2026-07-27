import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { createUser } from '../../test/utils/mock-entities';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockAuthService = {
    login: jest.fn(),
    changePassword: jest.fn(),
    requestPasswordReset: jest.fn(),
    approvePasswordReset: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
  };

  const mockUser = createUser();
  const mockAdminUser = createUser({ id: '2', username: 'admin', role: 'ADMIN' });
  const mockDeptLeadUser = createUser({ id: '3', username: 'hrlead', role: 'DEPT_LEAD' });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('POST /auth/login', () => {
    it('should login successfully', async () => {
      const dto = { username: 'johndoe', password: 'pass123' };
      const result = { accessToken: 'token', refreshToken: 'refresh', user: { id: '1' } };
      mockAuthService.login.mockResolvedValue(result);

      expect(await controller.login(dto)).toEqual(result);
      expect(authService.login).toHaveBeenCalledWith(dto);
    });
  });

  describe('GET /auth/profile', () => {
    it('should return user profile', async () => {
      const result = { id: '1', username: 'johndoe', role: 'EMPLOYEE', status: 'ACTIVE' };
      expect(await controller.getProfile(mockUser)).toEqual(result);
    });
  });

  describe('POST /auth/change-password', () => {
    it('should change password', async () => {
      const dto = { oldPassword: 'old', newPassword: 'new' };
      const result = { success: true };
      mockAuthService.changePassword.mockResolvedValue(result);

      expect(await controller.changePassword(mockUser, dto)).toEqual(result);
      expect(authService.changePassword).toHaveBeenCalledWith(mockUser.id, dto);
    });
  });

  describe('POST /auth/reset-password/request', () => {
    it('should request password reset', async () => {
      const dto = { targetUserId: '1', newPassword: 'newpass123' };
      const result = { success: true, message: 'Reset requested' };
      mockAuthService.requestPasswordReset.mockResolvedValue(result);

      expect(await controller.requestPasswordReset(mockDeptLeadUser, dto)).toEqual(result);
      expect(authService.requestPasswordReset).toHaveBeenCalledWith(mockDeptLeadUser, dto);
    });
  });

  describe('POST /auth/reset-password/approve/:requestId', () => {
    it('should approve password reset', async () => {
      const result = { success: true, message: 'Approved' };
      mockAuthService.approvePasswordReset.mockResolvedValue(result);

      expect(await controller.approvePasswordReset(mockAdminUser, 'req-1')).toEqual(result);
      expect(authService.approvePasswordReset).toHaveBeenCalledWith(mockAdminUser, 'req-1');
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh tokens', async () => {
      const dto = { refreshToken: 'old-refresh' };
      const result = { accessToken: 'new-access', refreshToken: 'new-refresh' };
      mockAuthService.refresh.mockResolvedValue(result);

      expect(await controller.refresh(dto)).toEqual(result);
      expect(authService.refresh).toHaveBeenCalledWith('old-refresh');
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout', async () => {
      const result = { success: true };
      mockAuthService.logout.mockResolvedValue(result);

      expect(await controller.logout(mockUser)).toEqual(result);
      expect(authService.logout).toHaveBeenCalledWith(mockUser.id);
    });
  });
});
