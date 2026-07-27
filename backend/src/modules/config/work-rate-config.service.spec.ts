// --- jest setup ---
// Suppress raw SQL console noise from TypeORM
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'warn').mockImplementation(() => {});

// Import test utilities
const { MockRepository } = require('../../test/utils/mock-repository');
const { createUser, createEmployee, createUserWithEmployee } = require('../../test/utils/mock-entities');

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { WorkRateConfigService } from './work-rate-config.service';
import { WorkRateConfig } from '../../entities/work-rate-config.entity';

describe('WorkRateConfigService', () => {
  let service: WorkRateConfigService;
  let configRepo: any;

  beforeEach(async () => {
    configRepo = new MockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkRateConfigService,
        {
          provide: getRepositoryToken(WorkRateConfig),
          useValue: configRepo,
        },
      ],
    }).compile();

    service = module.get<WorkRateConfigService>(WorkRateConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all configs ordered by key ASC', async () => {
      const mockConfigs = [
        { id: '1', configKey: 'OT_RATE_WEEKDAY' },
        { id: '2', configKey: 'OT_RATE_WEEKEND' },
      ];
      configRepo.find = jest.fn().mockResolvedValue(mockConfigs);

      const result = await service.findAll();

      expect(configRepo.find).toHaveBeenCalledWith({ order: { configKey: 'ASC' } });
      expect(result).toEqual(mockConfigs);
    });
  });

  describe('update', () => {
    it('should update valueMultiplier field only', async () => {
      const existingConfig = {
        id: '1',
        configKey: 'OT_RATE_WEEKDAY',
        valueMultiplier: 1.5,
        status: 'ACTIVE',
      };
      const dto = { valueMultiplier: 2.0 };
      const updatedConfig = { ...existingConfig, ...dto };

      configRepo.findOne = jest.fn().mockResolvedValue({ ...existingConfig });
      configRepo.save = jest.fn().mockResolvedValue(updatedConfig);

      const result = await service.update('OT_RATE_WEEKDAY', dto, 'actor-1');

      expect(configRepo.findOne).toHaveBeenCalledWith({ where: { configKey: 'OT_RATE_WEEKDAY' } });
      expect(configRepo.save).toHaveBeenCalled();
      expect(result.valueMultiplier).toBe(2.0);
      expect(result.status).toBe('ACTIVE');
    });

    it('should update status field only', async () => {
      const existingConfig = {
        id: '1',
        configKey: 'OT_RATE_WEEKDAY',
        valueMultiplier: 1.5,
        status: 'ACTIVE',
      };
      // DTO requires valueMultiplier (IsNotEmpty), status is optional
      const dto = { valueMultiplier: 1.5, status: 'INACTIVE' };
      const updatedConfig = { ...existingConfig, ...dto };

      configRepo.findOne = jest.fn().mockResolvedValue({ ...existingConfig });
      configRepo.save = jest.fn().mockResolvedValue(updatedConfig);

      const result = await service.update('OT_RATE_WEEKDAY', dto, 'actor-1');

      expect(result.status).toBe('INACTIVE');
    });

    it('should set updatedById to userId', async () => {
      const existingConfig = {
        id: '1',
        configKey: 'OT_RATE_WEEKDAY',
        valueMultiplier: 1.5,
        updatedById: null,
      };
      const dto = { valueMultiplier: 2.0 };
      const updatedConfig = { ...existingConfig, ...dto, updatedById: 'actor-1' };

      configRepo.findOne = jest.fn().mockResolvedValue({ ...existingConfig });
      configRepo.save = jest.fn().mockResolvedValue(updatedConfig);

      await service.update('OT_RATE_WEEKDAY', dto, 'actor-1');

      expect(configRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ updatedById: 'actor-1' }),
      );
    });

    it('should update effectiveDate to current date', async () => {
      const existingConfig = {
        id: '1',
        configKey: 'OT_RATE_WEEKDAY',
        valueMultiplier: 1.5,
        effectiveDate: new Date('2026-01-01'),
      };
      // DTO requires valueMultiplier, include it to satisfy the DTO type
      const dto = { valueMultiplier: 1.5, status: 'ACTIVE' };
      const updatedConfig = { ...existingConfig, ...dto };

      configRepo.findOne = jest.fn().mockResolvedValue({ ...existingConfig });
      configRepo.save = jest.fn().mockResolvedValue(updatedConfig);

      const beforeUpdate = Date.now();
      await service.update('OT_RATE_WEEKDAY', dto, 'actor-1');

      const savedEntity = configRepo.save.mock.calls[0][0];
      expect(new Date(savedEntity.effectiveDate).getTime()).toBeGreaterThanOrEqual(beforeUpdate);
    });

    it('should update all fields combined', async () => {
      const existingConfig = {
        id: '1',
        configKey: 'OT_RATE_WEEKDAY',
        configName: 'OT Rate Weekday',
        valueMultiplier: 1.5,
        effectiveDate: new Date('2026-01-01'),
        status: 'ACTIVE',
        updatedById: null,
      };
      const dto = {
        valueMultiplier: 2.0,
        status: 'INACTIVE',
      };
      const updatedConfig = { ...existingConfig, ...dto, updatedById: 'actor-1' };

      configRepo.findOne = jest.fn().mockResolvedValue({ ...existingConfig });
      configRepo.save = jest.fn().mockResolvedValue(updatedConfig);

      const result = await service.update('OT_RATE_WEEKDAY', dto, 'actor-1');

      expect(result.valueMultiplier).toBe(2.0);
      expect(result.status).toBe('INACTIVE');
      expect(result.updatedById).toBe('actor-1');
    });

    it('should throw NotFoundException when config not found', async () => {
      configRepo.findOne = jest.fn().mockResolvedValue(null);

      await expect(service.update('INVALID_KEY', { valueMultiplier: 2.0 }, 'actor-1')).rejects.toThrow(NotFoundException);
    });
  });
});
