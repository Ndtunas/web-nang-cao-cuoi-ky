import { Test, TestingModule } from '@nestjs/testing';
import { WorkRateConfigController } from './work-rate-config.controller';
import { WorkRateConfigService } from './work-rate-config.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { createWorkRateConfig, createUser } from '../../test/utils/mock-entities';

describe('WorkRateConfigController', () => {
  let controller: WorkRateConfigController;
  let service: jest.Mocked<WorkRateConfigService>;

  const mockService = {
    findAll: jest.fn(),
    update: jest.fn(),
  };

  const config = createWorkRateConfig();
  const adminUser = createUser({ id: '2', role: 'ADMIN' });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkRateConfigController],
      providers: [{ provide: WorkRateConfigService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<WorkRateConfigController>(WorkRateConfigController);
    service = module.get(WorkRateConfigService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('GET /config/work-rates', () => {
    it('should return all configs', async () => {
      mockService.findAll.mockResolvedValue([config]);
      expect(await controller.findAll()).toEqual([config]);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('PUT /config/work-rates/:key', () => {
    it('should update config', async () => {
      const dto = { valueMultiplier: 2.0 };
      const updated = { ...config, valueMultiplier: 2.0 };
      mockService.update.mockResolvedValue(updated);
      expect(await controller.update('OT_RATE_WEEKDAY', dto, adminUser)).toEqual(updated);
      expect(service.update).toHaveBeenCalledWith('OT_RATE_WEEKDAY', dto, adminUser.id);
    });
  });
});
