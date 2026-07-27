import { Test, TestingModule } from '@nestjs/testing';
import { ExportsController } from './exports.controller';
import { ExportsService } from './exports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { createUser } from '../../test/utils/mock-entities';
import { BadRequestException } from '@nestjs/common';

describe('ExportsController', () => {
  let controller: ExportsController;
  let service: jest.Mocked<ExportsService>;

  const mockService = {
    exportEmployees: jest.fn(),
    exportSalaries: jest.fn(),
    exportOtSummary: jest.fn(),
    exportLeaveRequests: jest.fn(),
  };

  const mockRes = {
    setHeader: jest.fn(),
    send: jest.fn(),
  } as any;

  const mockReq = { ip: '127.0.0.1', headers: {} } as any;
  const adminUser = createUser({ id: '2', role: 'ADMIN' });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExportsController],
      providers: [{ provide: ExportsService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ExportsController>(ExportsController);
    service = module.get(ExportsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('GET /exports/employees', () => {
    it('should export employees', async () => {
      const buf = Buffer.from('excel');
      mockService.exportEmployees.mockResolvedValue(buf);
      await controller.exportEmployees(adminUser, mockRes, mockReq);
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(mockRes.send).toHaveBeenCalledWith(buf);
    });
  });

  describe('GET /exports/salaries', () => {
    it('should export salaries', async () => {
      const buf = Buffer.from('excel');
      mockService.exportSalaries.mockResolvedValue(buf);
      await controller.exportSalaries(adminUser, '1', '2026', mockRes, mockReq);
      expect(mockService.exportSalaries).toHaveBeenCalled();
      expect(mockRes.send).toHaveBeenCalledWith(buf);
    });

    it('should throw BadRequestException if month/year missing', async () => {
      await expect(
        controller.exportSalaries(adminUser, '', '', mockRes, mockReq),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('GET /exports/ot-summary', () => {
    it('should export OT summary', async () => {
      const buf = Buffer.from('excel');
      mockService.exportOtSummary.mockResolvedValue(buf);
      await controller.exportOtSummary(adminUser, '1', '2026', mockRes, mockReq);
      expect(mockRes.send).toHaveBeenCalledWith(buf);
    });
  });

  describe('GET /exports/leave-requests', () => {
    it('should export leave requests', async () => {
      const buf = Buffer.from('excel');
      mockService.exportLeaveRequests.mockResolvedValue(buf);
      await controller.exportLeaveRequests(adminUser, '1', '2026', mockRes, mockReq);
      expect(mockRes.send).toHaveBeenCalledWith(buf);
    });
  });
});
