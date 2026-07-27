// --- jest setup ---
// Suppress raw SQL console noise from TypeORM
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'warn').mockImplementation(() => {});

// Import test utilities
const { MockRepository } = require('../../test/utils/mock-repository');
const { createUser, createEmployee, createUserWithEmployee } = require('../../test/utils/mock-entities');

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Between } from 'typeorm';
import { BusinessException } from '../../common/exceptions/business.exception';
import { AuditLogsService } from './audit-logs.service';
import { SystemAuditLog } from '../../entities/system-audit-log.entity';

describe('AuditLogsService', () => {
  let service: AuditLogsService;
  let auditLogRepo: any;

  beforeEach(async () => {
    auditLogRepo = new MockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogsService,
        {
          provide: getRepositoryToken(SystemAuditLog),
          useValue: auditLogRepo,
        },
      ],
    }).compile();

    service = module.get<AuditLogsService>(AuditLogsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return audit logs ordered by timestamp DESC without filters', async () => {
      const mockLogs = [{ id: '1', actionType: 'CREATE' }];
      auditLogRepo.find = jest.fn().mockResolvedValue(mockLogs);

      const result = await service.findAll({});

      expect(auditLogRepo.find).toHaveBeenCalled();
      const callArgs = auditLogRepo.find.mock.calls[0][0];
      expect(callArgs.order).toEqual({ timestamp: 'DESC' });
      expect(result).toEqual(mockLogs);
    });

    it('should filter by actionType when provided', async () => {
      auditLogRepo.find = jest.fn().mockResolvedValue([]);

      await service.findAll({ actionType: 'CREATE' });

      const callArgs = auditLogRepo.find.mock.calls[0][0];
      expect(callArgs.where.actionType).toBe('CREATE');
    });

    it('should filter by entityName when provided', async () => {
      auditLogRepo.find = jest.fn().mockResolvedValue([]);

      await service.findAll({ entityName: 'Employee' });

      const callArgs = auditLogRepo.find.mock.calls[0][0];
      expect(callArgs.where.entityName).toBe('Employee');
    });

    it('should filter by date range when fromDate and toDate provided', async () => {
      auditLogRepo.find = jest.fn().mockResolvedValue([]);

      const fromDate = new Date('2026-01-01');
      const toDate = new Date('2026-01-31');
      await service.findAll({ fromDate, toDate });

      const callArgs = auditLogRepo.find.mock.calls[0][0];
      expect(callArgs.where.timestamp).toBeDefined();
    });

    it('should filter by actorId when provided', async () => {
      auditLogRepo.find = jest.fn().mockResolvedValue([]);

      await service.findAll({ actorId: 'actor-1' });

      const callArgs = auditLogRepo.find.mock.calls[0][0];
      expect(callArgs.where.actorId).toBe('actor-1');
    });

    it('should combine all filters when all query params provided', async () => {
      auditLogRepo.find = jest.fn().mockResolvedValue([]);

      const fromDate = new Date('2026-01-01');
      const toDate = new Date('2026-01-31');
      await service.findAll({
        actionType: 'CREATE',
        entityName: 'Employee',
        fromDate,
        toDate,
        actorId: 'actor-1',
      });

      const callArgs = auditLogRepo.find.mock.calls[0][0];
      expect(callArgs.where.actionType).toBe('CREATE');
      expect(callArgs.where.entityName).toBe('Employee');
      expect(callArgs.where.actorId).toBe('actor-1');
      expect(callArgs.where.timestamp).toBeDefined();
    });
  });

  describe('getDiff', () => {
    it('should return oldData and newData from the log', async () => {
      const mockLog = {
        id: '1',
        oldData: JSON.stringify({ name: 'Old' }),
        newData: JSON.stringify({ name: 'New' }),
      };
      auditLogRepo.findOne = jest.fn().mockResolvedValue(mockLog);

      const result = await service.getDiff('1');

      expect(auditLogRepo.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(result.oldData).toEqual(JSON.stringify({ name: 'Old' }));
      expect(result.newData).toEqual(JSON.stringify({ name: 'New' }));
    });

    it('should throw BusinessException when audit log not found', async () => {
      auditLogRepo.findOne = jest.fn().mockResolvedValue(null);

      await expect(service.getDiff('999')).rejects.toThrow(BusinessException);
    });
  });

  describe('logExport', () => {
    it('should create and return an audit log entry', async () => {
      const dto = { actorId: 'actor-1', actorRole: 'ADMIN', entityName: 'Employee' };
      const mockSaved = { id: 'log-1', ...dto, actionType: 'EXPORT', entityId: '0' };

      auditLogRepo.create = jest.fn().mockReturnValue(mockSaved);
      auditLogRepo.save = jest.fn().mockResolvedValue(mockSaved);

      const result = await service.logExport(dto);

      expect(auditLogRepo.save).toHaveBeenCalledWith(expect.objectContaining({
        actorId: 'actor-1',
        actorRole: 'ADMIN',
        actionType: 'EXPORT',
        entityName: 'Employee',
      }));
      expect(result).toEqual(mockSaved);
    });
  });
});
