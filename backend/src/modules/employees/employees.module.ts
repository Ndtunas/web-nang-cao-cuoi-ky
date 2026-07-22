import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeesController } from './employees.controller.js';
import { EmployeesService } from './employees.service.js';
import { Employee } from '../../entities/employee.entity.js';
import { User } from '../../entities/user.entity.js';
import { Department } from '../../entities/department.entity.js';
import { Position } from '../../entities/position.entity.js';
import { JobHistory } from '../../entities/job-history.entity.js';
import { SalaryHistory } from '../../entities/salary-history.entity.js';
import { ApprovalRequest } from '../../entities/approval-request.entity.js';
import { ApprovalConfig } from '../../entities/approval-config.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Employee,
      User,
      Department,
      Position,
      JobHistory,
      SalaryHistory,
      ApprovalRequest,
      ApprovalConfig,
    ]),
  ],
  controllers: [EmployeesController],
  providers: [EmployeesService],
  exports: [EmployeesService],
})
export class EmployeesModule {}
