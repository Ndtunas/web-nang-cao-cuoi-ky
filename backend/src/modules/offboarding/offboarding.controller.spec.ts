import { Test, TestingModule } from '@nestjs/testing';
import { OffboardingController } from './offboarding.controller';
import { OffboardingService } from './offboarding.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { createUser } from '../../test/utils/mock-entities';

describe('OffboardingController', () => {
  let controller: OffboardingController;
  let service: jest.Mocked<OffboardingService>;

  const mockService = {
    submitResignation: jest.fn(),
    getTasksByEmployee: jest.fn(),
    getAllPendingTasks: jest.fn(),
    getTasksForRequesterDepartment: jest.fn(),
    completeTask: jest.fn(),
    checkAllCompleted: jest.fn(),
    finalSettlement: jest.fn(),
  };

  const mockUser = createUser({ id: '1', role: 'EMPLOYEE' });
  const adminUser = createUser({ id: '2', role: 'ADMIN' });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OffboardingController],
      providers: [{ provide: OffboardingService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<OffboardingController>(OffboardingController);
    service = module.get(OffboardingService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('POST /offboarding/resignation-request', () => {
    it('should submit resignation', async () => {
      const dto = { reason: 'Personal reasons' };
      const result = { approvalRequest: { id: '1' } };
      mockService.submitResignation.mockResolvedValue(result);

      expect(await controller.resign(dto, mockUser)).toEqual(result);
      expect(service.submitResignation).toHaveBeenCalledWith('Personal reasons', mockUser.id);
    });
  });

  describe('GET /offboarding/tasks/:employeeId', () => {
    it('should return tasks for employee', async () => {
      const result = [];
      mockService.getTasksByEmployee.mockResolvedValue(result);

      expect(await controller.getTasks('1')).toEqual(result);
      expect(service.getTasksByEmployee).toHaveBeenCalledWith('1');
    });
  });

  describe('GET /offboarding/tasks', () => {
    it('should return all pending tasks', async () => {
      const result = [];
      mockService.getAllPendingTasks.mockResolvedValue(result);

      expect(await controller.getAllPendingTasks()).toEqual(result);
      expect(service.getAllPendingTasks).toHaveBeenCalled();
    });
  });

  describe('GET /offboarding/tasks/my-department', () => {
    it('should return tasks for requester department', async () => {
      const result = [];
      mockService.getTasksForRequesterDepartment.mockResolvedValue(result);

      expect(await controller.getTasksByMyDepartment(mockUser)).toEqual(result);
      expect(service.getTasksForRequesterDepartment).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('PATCH /offboarding/tasks/:taskId/complete', () => {
    it('should complete task', async () => {
      const result = { id: '1', status: 'COMPLETED' };
      mockService.completeTask.mockResolvedValue(result);

      expect(await controller.completeTask('1', adminUser)).toEqual(result);
      expect(service.completeTask).toHaveBeenCalledWith('1', adminUser.id);
    });
  });

  describe('GET /offboarding/check-completed/:employeeId', () => {
    it('should check if all completed', async () => {
      mockService.checkAllCompleted.mockResolvedValue(true);

      expect(await controller.checkCompleted('1')).toEqual({ allCompleted: true });
      expect(service.checkAllCompleted).toHaveBeenCalledWith('1');
    });
  });

  describe('POST /offboarding/final-settlement', () => {
    it('should finalize settlement', async () => {
      const dto = { employeeId: '1', lastWorkingDay: '2026-03-31', unusedLeaveDays: 5, severanceAmount: 30000000 };
      const result = { employee: { id: '1', status: 'TERMINATED' }, netSettlement: 3409090, breakdown: {} };
      mockService.finalSettlement.mockResolvedValue(result);

      expect(await controller.finalSettlement(dto)).toEqual(result);
      expect(service.finalSettlement).toHaveBeenCalledWith(dto);
    });
  });
});
