// --- jest setup ---
// Suppress raw SQL console noise from TypeORM
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'warn').mockImplementation(() => {});

// Import test utilities
const { MockRepository } = require('../../test/utils/mock-repository');
const { createUser, createEmployee, createUserWithEmployee } = require('../../test/utils/mock-entities');

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BusinessException } from '../../common/exceptions/business.exception';
import { PositionsService } from './positions.service';
import { Position } from '../../entities/position.entity';
import { Employee } from '../../entities/employee.entity';

describe('PositionsService', () => {
  let service: PositionsService;
  let positionRepo: any;
  let employeeRepo: any;

  beforeEach(async () => {
    positionRepo = new MockRepository();
    employeeRepo = new MockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PositionsService,
        {
          provide: getRepositoryToken(Position),
          useValue: positionRepo,
        },
        {
          provide: getRepositoryToken(Employee),
          useValue: employeeRepo,
        },
      ],
    }).compile();

    service = module.get<PositionsService>(PositionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all positions ordered by title ASC', async () => {
      const mockPositions = [
        { id: '1', title: 'Junior Developer' },
        { id: '2', title: 'Senior Developer' },
      ];
      positionRepo.find = jest.fn().mockResolvedValue(mockPositions);

      const result = await service.findAll();

      expect(positionRepo.find).toHaveBeenCalledWith({ order: { title: 'ASC' } });
      expect(result).toEqual(mockPositions);
    });
  });

  describe('findOne', () => {
    it('should return a position when found', async () => {
      const mockPosition = { id: '1', title: 'Software Engineer' };
      positionRepo.findOne = jest.fn().mockResolvedValue(mockPosition);

      const result = await service.findOne('1');

      expect(positionRepo.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(result).toEqual(mockPosition);
    });

    it('should throw BusinessException when position not found', async () => {
      positionRepo.findOne = jest.fn().mockResolvedValue(null);

      await expect(service.findOne('999')).rejects.toThrow(BusinessException);
      await expect(service.findOne('999')).rejects.toMatchObject({
        errorCode: 'ERR_UNKNOWN',
      });
    });
  });

  describe('create', () => {
    it('should create a position and return it with auto-generated id', async () => {
      const dto = { title: 'DevOps Engineer', baseSalaryRatio: 1.2 };
      const mockCreated = { id: '123', ...dto };

      positionRepo.save = jest.fn().mockResolvedValue(mockCreated);

      const result = await service.create(dto);

      expect(positionRepo.save).toHaveBeenCalledWith(expect.objectContaining({ title: 'DevOps Engineer', baseSalaryRatio: 1.2 }));
      expect(result).toMatchObject({ id: '123', title: 'DevOps Engineer' });
    });
  });

  describe('update', () => {
    it('should update a position and return the updated entity', async () => {
      const existingPosition = { id: '1', title: 'Software Engineer', baseSalaryRatio: 1.0 };
      const dto = { title: 'Senior Software Engineer' };
      const updatedPosition = { ...existingPosition, ...dto };

      positionRepo.findOne = jest.fn().mockResolvedValue({ ...existingPosition });
      positionRepo.save = jest.fn().mockResolvedValue(updatedPosition);

      const result = await service.update('1', dto);

      expect(positionRepo.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(positionRepo.save).toHaveBeenCalled();
      expect(result.title).toBe('Senior Software Engineer');
    });

    it('should throw BusinessException when position not found for update', async () => {
      positionRepo.findOne = jest.fn().mockResolvedValue(null);

      await expect(service.update('999', { title: 'New Title' })).rejects.toThrow(BusinessException);
      await expect(service.update('999', { title: 'New Title' })).rejects.toMatchObject({
        errorCode: 'ERR_UNKNOWN',
      });
    });
  });

  describe('remove', () => {
    it('should remove a position when it has no employees', async () => {
      positionRepo.findOne = jest.fn().mockResolvedValue({ id: '1', title: 'Software Engineer' });
      employeeRepo.count = jest.fn().mockResolvedValue(0);
      // Mock remove to return undefined (TypeORM remove returns void)
      positionRepo.remove = jest.fn().mockResolvedValue(undefined);

      await expect(service.remove('1')).resolves.toEqual({ removed: true });
      expect(employeeRepo.count).toHaveBeenCalledWith({ where: { positionId: '1' } });
      expect(positionRepo.remove).toHaveBeenCalled();
    });

    it('should throw BusinessException when position has employees', async () => {
      positionRepo.findOne = jest.fn().mockResolvedValue({ id: '1', title: 'Software Engineer' });
      employeeRepo.count = jest.fn().mockResolvedValue(3);

      await expect(service.remove('1')).rejects.toThrow(BusinessException);
      await expect(service.remove('1')).rejects.toMatchObject({
        errorCode: 'ERR_EMP_002',
      });
    });

    it('should throw BusinessException when position not found for remove', async () => {
      positionRepo.findOne = jest.fn().mockResolvedValue(null);

      await expect(service.remove('999')).rejects.toThrow(BusinessException);
      await expect(service.remove('999')).rejects.toMatchObject({
        errorCode: 'ERR_UNKNOWN',
      });
    });
  });
});
