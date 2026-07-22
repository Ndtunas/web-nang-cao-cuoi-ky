import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DepartmentsController } from './departments.controller.js';
import { DepartmentsService } from './departments.service.js';
import { Department } from '../../entities/department.entity.js';
import { Employee } from '../../entities/employee.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Department, Employee])],
  controllers: [DepartmentsController],
  providers: [DepartmentsService],
  exports: [DepartmentsService],
})
export class DepartmentsModule {}
