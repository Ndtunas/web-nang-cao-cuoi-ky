import {
  IsOptional,
  IsString,
  IsDateString,
  IsNumber,
  IsIn,
  Min,
  MinLength,
  MaxLength,
} from 'class-validator';

/**
 * DTO tạo / cập nhật Dự án
 * Ref: database/02_tables_and_relationships.md bảng 7 (projects)
 *      business/01_user_stories.md (US-07 - khai timesheet cần project)
 */
export class CreateProjectDto {
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name: string;

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  pmId?: string;

  @IsOptional()
  @IsIn(['PLANNING', 'ACTIVE', 'COMPLETED', 'SUSPENDED'])
  status?: 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'SUSPENDED';
}

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  pmId?: string;

  @IsOptional()
  @IsIn(['PLANNING', 'ACTIVE', 'COMPLETED', 'SUSPENDED'])
  status?: 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'SUSPENDED';
}
