import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator';

/**
 * DTO tạo / cập nhật Task thuộc Project
 * Ref: database/02_tables_and_relationships.md bảng 8 (project_tasks)
 */
export class CreateProjectTaskDto {
  @IsString()
  projectId: string;

  @IsString()
  @MinLength(2)
  @MaxLength(150)
  taskName: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(9999.99)
  estimatedHours?: number;
}

export class UpdateProjectTaskDto {
  @IsOptional()
  @IsString()
  taskName?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(9999.99)
  estimatedHours?: number;
}
