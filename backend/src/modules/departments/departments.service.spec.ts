// --- jest setup ---
// Suppress raw SQL console noise from TypeORM
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'warn').mockImplementation(() => {});

// Import test utilities
const { MockRepository } = require('../../test/utils/mock-repository');
const { createUser, createEmployee, createUserWithEmployee } = require('../../test/utils/mock-entities');

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessException } from '../../common/exceptions/business.exception';
import { DepartmentsService } from './departments.service';
import { Department } from '../../entities/department.entity';
import { Employee } from '../../entities/employee.entity';

describe('DepartmentsService', () => {
  let service: DepartmentsService;
  let departmentRepo: any;
  let employeeRepo: any;

  beforeEach(async () => {
    departmentRepo = new MockRepository();
    employeeRepo = new MockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DepartmentsService,
        {
          provide: getRepositoryToken(Department),
          useValue: departmentRepo,
        },
        {
          provide: getRepositoryToken(Employee),
          useValue: employeeRepo,
        },
      ],
    }).compile();

    service = module.get<DepartmentsService>(DepartmentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all departments ordered by name ASC', async () => {
      const mockDepartments = [
        { id: '1', name: 'Engineering' },
        { id: '2', name: 'Human Resources' },
      ];
      departmentRepo.find = jest.fn().mockResolvedValue(mockDepartments);

      const result = await service.findAll();

      expect(departmentRepo.find).toHaveBeenCalledWith({ order: { name: 'ASC' } });
      expect(result).toEqual(mockDepartments);
    });
  });

  describe('findOne', () => {
    it('should return a department when found', async () => {
      const mockDepartment = { id: '1', name: 'Engineering' };
      departmentRepo.findOne = jest.fn().mockResolvedValue(mockDepartment);

      const result = await service.findOne('1');

      expect(departmentRepo.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(result).toEqual(mockDepartment);
    });

    it('should throw BusinessException when department not found', async () => {
      departmentRepo.findOne = jest.fn().mockResolvedValue(null);

      await expect(service.findOne('999')).rejects.toThrow(BusinessException);
      await expect(service.findOne('999')).rejects.toMatchObject({
        errorCode: 'ERR_UNKNOWN',
      });
    });
  });

  describe('create', () => {
    it('should throw BusinessException when department code already exists', async () => {
      departmentRepo.findOne = jest.fn().mockResolvedValue({ id: '1', deptCode: 'ENG' });

      await expect(service.create({ name: 'Engineering', deptCode: 'ENG' })).rejects.toMatchObject({
        errorCode: 'ERR_EMP_001',
      });
    });

    it('should create a department and return it with auto-generated id', async () => {
      const dto = { name: 'Engineering', deptCode: 'ENG' };
      const mockCreated = { id: '123', ...dto };

      departmentRepo.findOne = jest.fn().mockResolvedValue(null);
      departmentRepo.save = jest.fn().mockResolvedValue(mockCreated);

      const result = await service.create(dto);

      expect(departmentRepo.save).toHaveBeenCalledWith(expect.objectContaining({ name: 'Engineering', deptCode: 'ENG' }));
      expect(result).toMatchObject({ id: '123', name: 'Engineering' });
    });
  });

  describe('update', () => {
    it('should update a department and return the updated entity', async () => {
      const existingDept = { id: '1', name: 'Engineering', deptCode: 'ENG' };
      const dto = { name: 'Software Engineering' };
      const updatedDept = { ...existingDept, ...dto };

      departmentRepo.findOne = jest.fn().mockResolvedValue({ ...existingDept });
      departmentRepo.save = jest.fn().mockResolvedValue(updatedDept);

      const result = await service.update('1', dto);

      expect(departmentRepo.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(departmentRepo.save).toHaveBeenCalled();
      expect(result.name).toBe('Software Engineering');
    });

    it('should throw BusinessException when department not found for update', async () => {
      departmentRepo.findOne = jest.fn().mockResolvedValue(null);

      await expect(service.update('999', { name: 'New Name' })).rejects.toThrow(BusinessException);
    });
  });

  describe('remove', () => {
    it('should remove a department when it has no employees', async () => {
      departmentRepo.findOne = jest.fn().mockResolvedValue({ id: '1', name: 'Engineering' });
      employeeRepo.count = jest.fn().mockResolvedValue(0);
      departmentRepo.remove = jest.fn().mockResolvedValue({ id: '1', name: 'Engineering' });

      const result = await service.remove('1');

      expect(employeeRepo.count).toHaveBeenCalledWith({ where: { departmentId: '1' } });
      expect(departmentRepo.remove).toHaveBeenCalled();
      expect(result).toEqual({ removed: true });
    });

    it('should throw BusinessException ERR_EMP_002 when department has employees', async () => {
      departmentRepo.findOne = jest.fn().mockResolvedValue({ id: '1', name: 'Engineering' });
      employeeRepo.count = jest.fn().mockResolvedValue(5);

      await expect(service.remove('1')).rejects.toThrow(BusinessException);
      await expect(service.remove('1')).rejects.toMatchObject({
        errorCode: 'ERR_EMP_002',
      });
    });

    it('should throw BusinessException when department not found for remove', async () => {
      departmentRepo.findOne = jest.fn().mockResolvedValue(null);

      await expect(service.remove('999')).rejects.toThrow(BusinessException);
    });
  });
});
