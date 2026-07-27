import { Test, TestingModule } from '@nestjs/testing';
import { DepartmentsController } from './departments.controller';
import { DepartmentsService } from './departments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { createDepartment } from '../../test/utils/mock-entities';

describe('DepartmentsController', () => {
  let controller: DepartmentsController;
  let service: jest.Mocked<DepartmentsService>;

  const mockService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const dept = createDepartment();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DepartmentsController],
      providers: [{ provide: DepartmentsService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<DepartmentsController>(DepartmentsController);
    service = module.get(DepartmentsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('GET /departments', () => {
    it('should return all departments', async () => {
      mockService.findAll.mockResolvedValue([dept]);
      expect(await controller.findAll()).toEqual([dept]);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('GET /departments/:id', () => {
    it('should return one department', async () => {
      mockService.findOne.mockResolvedValue(dept);
      expect(await controller.findOne('1')).toEqual(dept);
      expect(service.findOne).toHaveBeenCalledWith('1');
    });
  });

  describe('POST /departments', () => {
    it('should create department', async () => {
      const dto = { deptCode: 'IT', name: 'IT Dept' };
      mockService.create.mockResolvedValue(dept);
      expect(await controller.create(dto)).toEqual(dept);
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('PATCH /departments/:id', () => {
    it('should update department', async () => {
      const dto = { name: 'New Name' };
      const updated = { ...dept, name: 'New Name' };
      mockService.update.mockResolvedValue(updated);
      expect(await controller.update('1', dto)).toEqual(updated);
      expect(service.update).toHaveBeenCalledWith('1', dto);
    });
  });

  describe('DELETE /departments/:id', () => {
    it('should remove department', async () => {
      mockService.remove.mockResolvedValue({ removed: true });
      expect(await controller.remove('1')).toEqual({ removed: true });
      expect(service.remove).toHaveBeenCalledWith('1');
    });
  });
});
