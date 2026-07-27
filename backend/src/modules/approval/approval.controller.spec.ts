import { Test, TestingModule } from '@nestjs/testing';
import { ApprovalController } from './approval.controller';
import { ApprovalService } from './approval.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { createUser } from '../../test/utils/mock-entities';

describe('ApprovalController', () => {
  let controller: ApprovalController;
  let service: jest.Mocked<ApprovalService>;

  const mockService = {
    getPendingMyLevel: jest.fn(),
    getMySubmitted: jest.fn(),
    getDetail: jest.fn(),
    getHistory: jest.fn(),
    approve: jest.fn(),
    reject: jest.fn(),
    getApprovalConfigs: jest.fn(),
    updateApprovalConfig: jest.fn(),
  };

  const mockUser = createUser({ id: '1', role: 'ADMIN' });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApprovalController],
      providers: [{ provide: ApprovalService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ApprovalController>(ApprovalController);
    service = module.get(ApprovalService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('GET /approval-requests/pending-my-level', () => {
    it('should return pending requests for user level', async () => {
      const result = [{ id: '1', status: 'PENDING' }];
      mockService.getPendingMyLevel.mockResolvedValue(result);

      expect(await controller.getPendingMyLevel(mockUser)).toEqual(result);
      expect(service.getPendingMyLevel).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('GET /approval-requests/my-submitted', () => {
    it('should return submitted requests', async () => {
      const result = [];
      mockService.getMySubmitted.mockResolvedValue(result);

      expect(await controller.getMySubmitted(mockUser)).toEqual(result);
      expect(service.getMySubmitted).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('GET /approval-requests/:id/detail', () => {
    it('should return request detail', async () => {
      const result = { id: '1', transactionType: 'LEAVE_SHORT' };
      mockService.getDetail.mockResolvedValue(result);

      expect(await controller.getDetail('1')).toEqual(result);
      expect(service.getDetail).toHaveBeenCalledWith('1');
    });
  });

  describe('GET /approval-requests/:id/history', () => {
    it('should return approval history', async () => {
      const result = [{ stepLevel: 1, action: 'APPROVE' }];
      mockService.getHistory.mockResolvedValue(result);

      expect(await controller.getHistory('1')).toEqual(result);
      expect(service.getHistory).toHaveBeenCalledWith('1');
    });
  });

  describe('PATCH /approval-requests/:id/approve', () => {
    it('should approve request', async () => {
      const result = { id: '1', status: 'APPROVED' };
      mockService.approve.mockResolvedValue(result);

      expect(await controller.approve('1', 'LGTM', mockUser)).toEqual(result);
      expect(service.approve).toHaveBeenCalledWith('1', 'LGTM', mockUser.id);
    });
  });

  describe('PATCH /approval-requests/:id/reject', () => {
    it('should reject request', async () => {
      const result = { id: '1', status: 'REJECTED' };
      mockService.reject.mockResolvedValue(result);

      expect(await controller.reject('1', 'Not approved', mockUser)).toEqual(result);
      expect(service.reject).toHaveBeenCalledWith('1', 'Not approved', mockUser.id);
    });
  });

  describe('GET /approval-configs', () => {
    it('should return all configs', async () => {
      const result = [];
      mockService.getApprovalConfigs.mockResolvedValue(result);

      expect(await controller.getApprovalConfigs()).toEqual(result);
      expect(service.getApprovalConfigs).toHaveBeenCalled();
    });
  });

  describe('PUT /approval-configs/:transactionType', () => {
    it('should update config', async () => {
      const result = { transactionType: 'LEAVE_SHORT', requiredLevels: 2 };
      mockService.updateApprovalConfig.mockResolvedValue(result);

      expect(await controller.updateApprovalConfig('LEAVE_SHORT', 2)).toEqual(result);
      expect(service.updateApprovalConfig).toHaveBeenCalledWith('LEAVE_SHORT', 2);
    });
  });
});
