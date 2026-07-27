import { Test, TestingModule } from '@nestjs/testing';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { createUser } from '../../test/utils/mock-entities';

describe('OnboardingController', () => {
  let controller: OnboardingController;
  let service: jest.Mocked<OnboardingService>;

  const mockService = {
    initiateOnboarding: jest.fn(),
    getAllPendingTasks: jest.fn(),
    getDashboard: jest.fn(),
    getTasksForDepartment: jest.fn(),
    getTasksByEmployee: jest.fn(),
    assignTask: jest.fn(),
    updateTaskStatus: jest.fn(),
    completeTask: jest.fn(),
    promoteToOfficial: jest.fn(),
  };

  const adminUser = createUser({ id: '2', role: 'ADMIN' });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OnboardingController],
      providers: [{ provide: OnboardingService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<OnboardingController>(OnboardingController);
    service = module.get(OnboardingService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('POST /onboarding/initiate', () => {
    it('should initiate onboarding', async () => {
      const dto = { employee: { fullName: 'Jane', email: 'jane@test.com', dob: '1995-01-15' } };
      const result = { employee: {}, tasks: [] };
      mockService.initiateOnboarding.mockResolvedValue(result);

      expect(await controller.initiate(dto, adminUser)).toEqual(result);
      expect(service.initiateOnboarding).toHaveBeenCalledWith(dto, adminUser.id);
    });
  });

  describe('GET /onboarding/tasks', () => {
    it('should return all pending tasks', async () => {
      const result = [];
      mockService.getAllPendingTasks.mockResolvedValue(result);

      expect(await controller.getAllPending()).toEqual(result);
      expect(service.getAllPendingTasks).toHaveBeenCalled();
    });
  });

  describe('GET /onboarding/dashboard', () => {
    it('should return dashboard', async () => {
      const result = { pendingByDepartment: { HR: 3, IT: 2, ADMIN: 1 }, recentOnboardings: [] };
      mockService.getDashboard.mockResolvedValue(result);

      expect(await controller.getDashboard()).toEqual(result);
      expect(service.getDashboard).toHaveBeenCalled();
    });
  });

  describe('GET /onboarding/tasks/:department', () => {
    it('should return tasks by department', async () => {
      const result = [];
      mockService.getTasksForDepartment.mockResolvedValue(result);

      expect(await controller.getByDepartment('HR')).toEqual(result);
      expect(service.getTasksForDepartment).toHaveBeenCalledWith('HR');
    });
  });

  describe('GET /onboarding/employee/:employeeId', () => {
    it('should return tasks for employee', async () => {
      const result = [];
      mockService.getTasksByEmployee.mockResolvedValue(result);

      expect(await controller.getByEmployee('1')).toEqual(result);
      expect(service.getTasksByEmployee).toHaveBeenCalledWith('1');
    });
  });

  describe('PATCH /onboarding/tasks/:taskId/assign', () => {
    it('should assign task', async () => {
      const dto = { assigneeId: '3' };
      const result = { id: '1', status: 'IN_PROGRESS' };
      mockService.assignTask.mockResolvedValue(result);

      expect(await controller.assignTask('1', dto, adminUser)).toEqual(result);
      expect(service.assignTask).toHaveBeenCalledWith('1', dto, adminUser.id);
    });
  });

  describe('PATCH /onboarding/tasks/:taskId/status', () => {
    it('should update task status', async () => {
      const dto = { status: 'COMPLETED' as const };
      const result = { id: '1', status: 'COMPLETED' };
      mockService.updateTaskStatus.mockResolvedValue(result);

      expect(await controller.updateTaskStatus('1', dto, adminUser)).toEqual(result);
      expect(service.updateTaskStatus).toHaveBeenCalledWith('1', 'COMPLETED', adminUser.id);
    });
  });

  describe('PATCH /onboarding/tasks/:taskId/complete', () => {
    it('should complete task', async () => {
      const result = { id: '1', status: 'COMPLETED', completedAt: new Date() };
      mockService.completeTask.mockResolvedValue(result);

      expect(await controller.complete('1', adminUser)).toEqual(result);
      expect(service.completeTask).toHaveBeenCalledWith('1', adminUser.id);
    });
  });

  describe('PATCH /onboarding/promote/:employeeId', () => {
    it('should promote employee', async () => {
      const result = { id: '1', status: 'OFFICIAL' };
      mockService.promoteToOfficial.mockResolvedValue(result);

      expect(await controller.promote('1')).toEqual(result);
      expect(service.promoteToOfficial).toHaveBeenCalledWith('1');
    });
  });
});
