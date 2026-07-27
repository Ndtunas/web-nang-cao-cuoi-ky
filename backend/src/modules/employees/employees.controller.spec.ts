import { Test, TestingModule } from '@nestjs/testing';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { createEmployee, createUser } from '../../test/utils/mock-entities';

describe('EmployeesController', () => {
  let controller: EmployeesController;
  let service: jest.Mocked<EmployeesService>;

  const mockService = {
    findAll: jest.fn(),
    getStats: jest.fn(),
    create: jest.fn(),
    updatePersonalInfo: jest.fn(),
    submitJobTransfer: jest.fn(),
    submitSalaryAdjustment: jest.fn(),
    getJobHistory: jest.fn(),
    getSalaryHistory: jest.fn(),
    submitDisciplineReward: jest.fn(),
    promoteToOfficial: jest.fn(),
    terminateEmployee: jest.fn(),
  };

  const adminUser = createUser({ id: '2', role: 'ADMIN' });
  const employee = createEmployee();
  const employeeUser = createUser({ id: '1', role: 'EMPLOYEE' });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmployeesController],
      providers: [{ provide: EmployeesService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<EmployeesController>(EmployeesController);
    service = module.get(EmployeesService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('GET /employees', () => {
    it('should return all employees', async () => {
      const result = [employee];
      mockService.findAll.mockResolvedValue(result);

      expect(await controller.findAll()).toEqual(result);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('GET /employees/stats', () => {
    it('should return stats', async () => {
      const result = { totalEmployees: 10, activeEmployees: 8, onLeave: 1, newHires: 2, departments: [] };
      mockService.getStats.mockResolvedValue(result);

      expect(await controller.getStats()).toEqual(result);
      expect(service.getStats).toHaveBeenCalled();
    });
  });

  describe('POST /employees', () => {
    it('should create employee', async () => {
      const dto = { fullName: 'Jane', email: 'jane@test.com', dob: '1995-01-15' };
      const result = createEmployee({ fullName: 'Jane', email: 'jane@test.com' });
      mockService.create.mockResolvedValue(result);

      expect(await controller.create(dto)).toEqual(result);
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('PATCH /employees/:id/personal-info', () => {
    it('should update personal info', async () => {
      const dto = { phone: '0909999999' };
      const result = createEmployee({ phone: '0909999999' });
      mockService.updatePersonalInfo.mockResolvedValue(result);

      expect(await controller.updatePersonalInfo('1', dto)).toEqual(result);
      expect(service.updatePersonalInfo).toHaveBeenCalledWith('1', dto);
    });
  });

  describe('POST /employees/job-transfers', () => {
    it('should submit job transfer', async () => {
      const dto = { employeeId: '1', newDepartmentId: '2', newPositionId: '2', effectiveDate: '2026-03-01' };
      const result = { approvalRequest: { id: '1' }, jobHistory: { id: '1' } };
      mockService.submitJobTransfer.mockResolvedValue(result);

      expect(await controller.submitJobTransfer(dto, employeeUser)).toEqual(result);
      expect(service.submitJobTransfer).toHaveBeenCalledWith(dto, employeeUser.id);
    });
  });

  describe('POST /employees/salary-adjustments', () => {
    it('should submit salary adjustment', async () => {
      const dto = { employeeId: '1', newBaseSalary: 20000000 };
      const result = { approvalRequest: { id: '1' } };
      mockService.submitSalaryAdjustment.mockResolvedValue(result);

      expect(await controller.submitSalaryAdjustment(dto, employeeUser)).toEqual(result);
      expect(service.submitSalaryAdjustment).toHaveBeenCalledWith(dto, employeeUser.id);
    });
  });

  describe('GET /employees/:id/job-history', () => {
    it('should return job history', async () => {
      const result = [];
      mockService.getJobHistory.mockResolvedValue(result);

      expect(await controller.getJobHistory('1')).toEqual(result);
      expect(service.getJobHistory).toHaveBeenCalledWith('1');
    });
  });

  describe('GET /employees/:id/salary-history', () => {
    it('should return salary history', async () => {
      const result = [];
      mockService.getSalaryHistory.mockResolvedValue(result);

      expect(await controller.getSalaryHistory('1')).toEqual(result);
      expect(service.getSalaryHistory).toHaveBeenCalledWith('1');
    });
  });

  describe('POST /employees/discipline-rewards', () => {
    it('should submit discipline reward', async () => {
      const dto = { employeeId: '1', type: 'REWARD', amount: 1000000 };
      const result = { approvalRequest: { id: '1' }, message: 'Reward recorded' };
      mockService.submitDisciplineReward.mockResolvedValue(result);

      expect(await controller.submitDisciplineReward(dto, adminUser)).toEqual(result);
      expect(service.submitDisciplineReward).toHaveBeenCalledWith(dto, adminUser.id);
    });
  });

  describe('PATCH /employees/:id/promote', () => {
    it('should promote to official', async () => {
      const result = createEmployee({ status: 'OFFICIAL' });
      mockService.promoteToOfficial.mockResolvedValue(result);

      expect(await controller.promoteToOfficial('1')).toEqual(result);
      expect(service.promoteToOfficial).toHaveBeenCalledWith('1');
    });
  });

  describe('PATCH /employees/:id/terminate', () => {
    it('should terminate employee', async () => {
      const dto = { endDate: '2026-03-31' };
      const result = createEmployee({ status: 'TERMINATED' });
      mockService.terminateEmployee.mockResolvedValue(result);

      expect(await controller.terminate('1', dto)).toEqual(result);
      expect(service.terminateEmployee).toHaveBeenCalledWith('1', dto.endDate);
    });
  });
});
