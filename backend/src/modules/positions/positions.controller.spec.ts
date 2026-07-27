import { Test, TestingModule } from '@nestjs/testing';
import { PositionsController } from './positions.controller';
import { PositionsService } from './positions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { createPosition } from '../../test/utils/mock-entities';

describe('PositionsController', () => {
  let controller: PositionsController;
  let service: jest.Mocked<PositionsService>;

  const mockService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const position = createPosition();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PositionsController],
      providers: [{ provide: PositionsService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PositionsController>(PositionsController);
    service = module.get(PositionsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('GET /positions', () => {
    it('should return all positions', async () => {
      mockService.findAll.mockResolvedValue([position]);
      expect(await controller.findAll()).toEqual([position]);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('GET /positions/:id', () => {
    it('should return one position', async () => {
      mockService.findOne.mockResolvedValue(position);
      expect(await controller.findOne('1')).toEqual(position);
      expect(service.findOne).toHaveBeenCalledWith('1');
    });
  });

  describe('POST /positions', () => {
    it('should create position', async () => {
      const dto = { title: 'Senior Engineer', baseSalaryRatio: 1.5 };
      mockService.create.mockResolvedValue(position);
      expect(await controller.create(dto)).toEqual(position);
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('PATCH /positions/:id', () => {
    it('should update position', async () => {
      const dto = { title: 'Lead Engineer' };
      mockService.update.mockResolvedValue({ ...position, title: 'Lead Engineer' });
      expect(await controller.update('1', dto)).toBeDefined();
      expect(service.update).toHaveBeenCalledWith('1', dto);
    });
  });

  describe('DELETE /positions/:id', () => {
    it('should remove position', async () => {
      mockService.remove.mockResolvedValue({ removed: true });
      expect(await controller.remove('1')).toEqual({ removed: true });
      expect(service.remove).toHaveBeenCalledWith('1');
    });
  });
});
