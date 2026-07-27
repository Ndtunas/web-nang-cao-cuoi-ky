import { Test, TestingModule } from '@nestjs/testing';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { createUser } from '../../test/utils/mock-entities';

describe('PayrollController', () => {
  let controller: PayrollController;
  let service: jest.Mocked<PayrollService>;

  const mockService = {
    calculateMonthly: jest.fn(),
    getSalaries: jest.fn(),
    approveMonthly: jest.fn(),
    getMyPayslip: jest.fn(),
  };

  const mockUser = createUser({ id: '1' });
  const adminUser = createUser({ id: '2', role: 'ADMIN' });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PayrollController],
      providers: [{ provide: PayrollService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PayrollController>(PayrollController);
    service = module.get(PayrollService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('POST /payroll/calculate-monthly', () => {
    it('should calculate monthly payroll', async () => {
      const dto = { month: 1, year: 2026 };
      const result = [];
      mockService.calculateMonthly.mockResolvedValue(result);

      expect(await controller.calculateMonthly(dto)).toEqual(result);
      expect(service.calculateMonthly).toHaveBeenCalledWith(dto);
    });
  });

  describe('GET /payroll/salaries', () => {
    it('should return salaries', async () => {
      const result = [];
      mockService.getSalaries.mockResolvedValue(result);

      expect(await controller.getSalaries(1, 2026)).toEqual(result);
      expect(service.getSalaries).toHaveBeenCalledWith(1, 2026);
    });
  });

  describe('PATCH /payroll/approve', () => {
    it('should batch approve salaries', async () => {
      const dto = { month: 1, year: 2026, comment: 'Approved' };
      const result = { updated: 10, salaries: [] };
      mockService.approveMonthly.mockResolvedValue(result);

      expect(await controller.approveMonthly(dto)).toEqual(result);
      expect(service.approveMonthly).toHaveBeenCalledWith(dto);
    });
  });

  describe('GET /payroll/my-payslip', () => {
    it('should return my payslip', async () => {
      const result = { id: '1', payrollCode: 'PAY-1-1-2026', netSalary: 16000000 };
      mockService.getMyPayslip.mockResolvedValue(result);

      expect(await controller.getMyPayslip(mockUser, 1, 2026)).toEqual(result);
      expect(service.getMyPayslip).toHaveBeenCalledWith(mockUser.id, 1, 2026);
    });
  });
});
