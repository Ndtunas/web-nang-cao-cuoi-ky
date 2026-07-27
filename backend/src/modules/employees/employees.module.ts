import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { Employee } from '../../entities/employee.entity';
import { User } from '../../entities/user.entity';
import { Department } from '../../entities/department.entity';
import { Position } from '../../entities/position.entity';
import { JobHistory } from '../../entities/job-history.entity';
import { SalaryHistory } from '../../entities/salary-history.entity';
import { ApprovalRequest } from '../../entities/approval-request.entity';
import { ApprovalConfig } from '../../entities/approval-config.entity';

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
