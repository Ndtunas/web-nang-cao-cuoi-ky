import { IsNotEmpty, IsString, Matches } from 'class-validator';
import {
  PASSWORD_REGEX,
  PASSWORD_MESSAGE,
} from '../../../common/validators/validation-rules.js';

export class ResetPasswordRequestDto {
  @IsNotEmpty({ message: 'User ID không được để trống' })
  @IsString({ message: 'User ID phải là chuỗi ký tự' })
  targetUserId: string;

  @IsNotEmpty({ message: 'Mật khẩu mới không được để trống' })
  @IsString({ message: 'Mật khẩu mới phải là chuỗi ký tự' })
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MESSAGE })
  newPassword: string;
}
