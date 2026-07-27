import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { createUser } from '../../test/utils/mock-entities';
import { UserRole } from '../../common/enums/business-values';

describe('UsersController', () => {
  let controller: UsersController;
  let service: jest.Mocked<UsersService>;

  const mockService = { updateRole: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get(UsersService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('PATCH /users/:id/role', () => {
    it('should update user role', async () => {
      const dto = { role: UserRole.DEPT_LEAD };
      const updated = { ...createUser(), role: UserRole.DEPT_LEAD };
      mockService.updateRole.mockResolvedValue(updated);

      expect(await controller.updateRole('1', dto)).toEqual(updated);
      expect(service.updateRole).toHaveBeenCalledWith('1', dto);
    });
  });
});
