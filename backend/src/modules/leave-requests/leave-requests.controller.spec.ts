import { Test, TestingModule } from '@nestjs/testing';
import { LeaveRequestsController } from './leave-requests.controller';
import { LeaveRequestsService } from './leave-requests.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { createUser } from '../../test/utils/mock-entities';

describe('LeaveRequestsController', () => {
  let controller: LeaveRequestsController;
  let service: jest.Mocked<LeaveRequestsService>;

  const mockService = {
    submitLeave: jest.fn(),
    getMyLeaveRequests: jest.fn(),
    getAllLeaveRequests: jest.fn(),
    cancelLeave: jest.fn(),
  };

  const mockUser = createUser({ id: '1' });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LeaveRequestsController],
      providers: [{ provide: LeaveRequestsService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<LeaveRequestsController>(LeaveRequestsController);
    service = module.get(LeaveRequestsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('POST /leave-requests', () => {
    it('should submit leave request', async () => {
      const dto = { leaveType: 'ANNUAL_LEAVE', startDate: '2026-02-01', endDate: '2026-02-02', reason: 'Vacation' };
      const result = { leaveRequest: { id: '1' }, approvalRequest: { id: '2' } };
      mockService.submitLeave.mockResolvedValue(result);

      expect(await controller.submit(dto, mockUser)).toEqual(result);
      expect(service.submitLeave).toHaveBeenCalledWith(dto, mockUser.id);
    });
  });

  describe('GET /leave-requests/my-requests', () => {
    it('should return own requests', async () => {
      const result = [];
      mockService.getMyLeaveRequests.mockResolvedValue(result);

      expect(await controller.getMyRequests(mockUser)).toEqual(result);
      expect(service.getMyLeaveRequests).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('GET /leave-requests', () => {
    it('should return all requests', async () => {
      const result = [];
      mockService.getAllLeaveRequests.mockResolvedValue(result);

      expect(await controller.getAll()).toEqual(result);
      expect(service.getAllLeaveRequests).toHaveBeenCalled();
    });
  });

  describe('DELETE /leave-requests/:id', () => {
    it('should cancel leave request', async () => {
      const result = { id: '1', status: 'CANCELLED' };
      mockService.cancelLeave.mockResolvedValue(result);

      expect(await controller.cancel('1', mockUser)).toEqual(result);
      expect(service.cancelLeave).toHaveBeenCalledWith('1', mockUser.id);
    });
  });
});
