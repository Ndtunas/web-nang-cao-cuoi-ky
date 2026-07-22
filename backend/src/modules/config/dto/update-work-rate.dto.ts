import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateWorkRateDto {
  @IsNotEmpty({ message: 'Giá trị hệ số không được để trống' })
  @IsNumber({}, { message: 'Giá trị hệ số phải là số' })
  valueMultiplier: number;

  @IsOptional()
  @IsString({ message: 'Trạng thái phải là chuỗi ký tự' })
  status?: string;
}
