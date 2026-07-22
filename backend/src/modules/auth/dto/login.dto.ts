import { IsNotEmpty, IsString, Matches } from 'class-validator';
import {
  PASSWORD_REGEX,
  PASSWORD_MESSAGE,
} from '../../../common/validators/validation-rules.js';

export class LoginDto {
  @IsNotEmpty({ message: 'Tên đăng nhập không được để trống' })
  @IsString({ message: 'Tên đăng nhập phải là chuỗi ký tự' })
  username: string;

  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @IsString({ message: 'Mật khẩu phải là chuỗi ký tự' })
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MESSAGE })
  password: string;
}
