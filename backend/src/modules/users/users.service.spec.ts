// --- jest setup ---
// Suppress raw SQL console noise from TypeORM
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'warn').mockImplementation(() => {});

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BusinessException } from '../../common/exceptions/business.exception';
import { UsersService } from './users.service';
import { User } from '../../entities/user.entity';
import { UserRole } from '../../common/enums/business-values';

describe('UsersService', () => {
  let service: UsersService;
  let userRepo: any;

  beforeEach(async () => {
    userRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: userRepo,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('updateRole', () => {
    it('should update user role and return user without passwordHash', async () => {
      const existingUser = {
        id: '1',
        username: 'johndoe',
        role: 'EMPLOYEE',
        passwordHash: '$2b$10$...',
      };
      const dto = { role: UserRole.DEPT_LEAD };
      const updatedUser = { ...existingUser, ...dto };

      userRepo.findOne = jest.fn().mockResolvedValue({ ...existingUser });
      userRepo.save = jest.fn().mockResolvedValue(updatedUser);

      const result = await service.updateRole('1', dto);

      expect(userRepo.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(userRepo.save).toHaveBeenCalled();
      expect(result.role).toBe('DEPT_LEAD');
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should throw BusinessException ERR_AUTH_003 when user not found', async () => {
      userRepo.findOne = jest.fn().mockResolvedValue(null);

      await expect(service.updateRole('999', { role: UserRole.ADMIN })).rejects.toThrow(BusinessException);
    });
  });
});
