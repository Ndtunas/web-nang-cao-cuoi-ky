import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsObject,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

/**
 * Convert empty string (`""`) → `undefined` để @IsOptional() bỏ qua.
 * class-validator mặc định @IsOptional chỉ skip null/undefined,
 * không skip empty string. Frontend form gửi `""` cho field không nhập.
 */
const emptyToUndefined = ({ value }: { value: unknown }) => {
  if (value === '' || value === null) return undefined;
  return value;
};

export class InitiateEmployeeDto {
  @IsString()
  fullName: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @Transform(emptyToUndefined)
  phone?: string;

  @IsOptional()
  @IsString()
  @Transform(emptyToUndefined)
  gender?: string;

  /**
   * DOB bắt buộc — dùng để tái tạo plaintext khi login theo spec §6.
   * Nếu thiếu sẽ throw ERR_EMP_001 ở service layer (defense in depth).
   */
  @IsDateString()
  dob: string;

  @IsOptional()
  @IsString()
  @Transform(emptyToUndefined)
  address?: string;

  @IsOptional()
  @IsString()
  @Transform(emptyToUndefined)
  taxCode?: string;

  @IsOptional()
  @IsString()
  @Transform(emptyToUndefined)
  bankName?: string;

  @IsOptional()
  @IsString()
  @Transform(emptyToUndefined)
  bankAccount?: string;

  @IsOptional()
  @IsDateString()
  @Transform(emptyToUndefined)
  joinDate?: string;

  @IsOptional()
  @IsString()
  @Transform(emptyToUndefined)
  departmentId?: string;

  @IsOptional()
  @IsString()
  @Transform(emptyToUndefined)
  positionId?: string;
}

/**
 * DTO cho POST /onboarding/initiate.
 * Phải có đúng 1 trong 2: `employee` (tạo mới) hoặc `employeeId` (đã có).
 */
export class InitiateOnboardingDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => InitiateEmployeeDto)
  @IsObject()
  employee?: InitiateEmployeeDto;

  @IsOptional()
  @IsString()
  @ValidateIf((o) => !o.employee)
  @Transform(emptyToUndefined)
  employeeId?: string;

  @IsOptional()
  @IsDateString()
  @Transform(emptyToUndefined)
  dueDate?: string;
}