import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApprovalController } from './approval.controller';
import { ApprovalService } from './approval.service';
import { ApprovalConfig } from '../../entities/approval-config.entity';
import { ApprovalRequest } from '../../entities/approval-request.entity';
import { ApprovalStepHistory } from '../../entities/approval-step-history.entity';
import { Employee } from '../../entities/employee.entity';
import { User } from '../../entities/user.entity';
import { Timesheet } from '../../entities/timesheet.entity';
import { JobHistory } from '../../entities/job-history.entity';
import { SalaryHistory } from '../../entities/salary-history.entity';
import { Salary } from '../../entities/salary.entity';
import { LeaveRequest } from '../../entities/leave-request.entity';
import { OffboardingTask } from '../../entities/offboarding-task.entity';
import { Notification } from '../../entities/notification.entity';

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
      LeaveRequest,
      OffboardingTask,
      Notification,
    ]),
  ],
  controllers: [ApprovalController],
  providers: [ApprovalService],
  exports: [ApprovalService],
})
export class ApprovalModule {}
