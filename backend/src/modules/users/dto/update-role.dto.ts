import { IsEnum, IsNotEmpty } from 'class-validator';
import { UserRole } from '../../../common/enums/business-values';

export class UpdateRoleDto {
  @IsNotEmpty({ message: 'Vai trò không được để trống' })
  @IsEnum(UserRole, { message: 'Vai trò không hợp lệ' })
  role: UserRole;
}
