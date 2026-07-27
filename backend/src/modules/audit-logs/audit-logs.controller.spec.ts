import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogsController } from './audit-logs.controller';
import { AuditLogsService } from './audit-logs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { createSystemAuditLog } from '../../test/utils/mock-entities';

describe('AuditLogsController', () => {
  let controller: AuditLogsController;
  let service: jest.Mocked<AuditLogsService>;

  const mockService = {
    findAll: jest.fn(),
    getDiff: jest.fn(),
  };

  const log = createSystemAuditLog();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditLogsController],
      providers: [{ provide: AuditLogsService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuditLogsController>(AuditLogsController);
    service = module.get(AuditLogsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('GET /audit-logs', () => {
    it('should return filtered logs', async () => {
      mockService.findAll.mockResolvedValue([log]);
      expect(await controller.findAll({ actionType: 'CREATE' })).toEqual([log]);
      expect(service.findAll).toHaveBeenCalledWith({ actionType: 'CREATE' });
    });
  });

  describe('GET /audit-logs/:id/diff', () => {
    it('should return diff', async () => {
      const diff = { oldData: null, newData: { name: 'John' } };
      mockService.getDiff.mockResolvedValue(diff);
      expect(await controller.getDiff('1')).toEqual(diff);
      expect(service.getDiff).toHaveBeenCalledWith('1');
    });
  });
});
