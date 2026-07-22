import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApprovalController } from './approval.controller.js';
import { ApprovalService } from './approval.service.js';
import { ApprovalConfig } from '../../entities/approval-config.entity.js';
import { ApprovalRequest } from '../../entities/approval-request.entity.js';
import { ApprovalStepHistory } from '../../entities/approval-step-history.entity.js';
import { Employee } from '../../entities/employee.entity.js';
import { User } from '../../entities/user.entity.js';
import { Timesheet } from '../../entities/timesheet.entity.js';
import { JobHistory } from '../../entities/job-history.entity.js';
import { SalaryHistory } from '../../entities/salary-history.entity.js';
import { Salary } from '../../entities/salary.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ApprovalConfig,
      ApprovalRequest,
      ApprovalStepHistory,
      Employee,
      User,
      Timesheet,
      JobHistory,
      SalaryHistory,
      Salary,
    ]),
  ],
  controllers: [ApprovalController],
  providers: [ApprovalService],
  exports: [ApprovalService],
})
export class ApprovalModule {}
