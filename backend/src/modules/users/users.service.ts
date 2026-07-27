import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { UpdateRoleDto } from './dto/update-role.dto';
import { BusinessException } from '../../common/exceptions/business.exception';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Cập nhật vai trò người dùng (Chỉ dành cho Admin)
   */
  async updateRole(id: string, updateRoleDto: UpdateRoleDto) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new BusinessException('ERR_AUTH_003');
    }

    user.role = updateRoleDto.role;
    const updatedUser = await this.userRepository.save(user);

    // Trả về thông tin ngoại trừ passwordHash
    const { passwordHash, ...result } = updatedUser;
    return result;
  }
}
