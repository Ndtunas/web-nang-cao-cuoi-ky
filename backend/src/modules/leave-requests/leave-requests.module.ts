import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeaveRequestsController } from './leave-requests.controller';
import { LeaveRequestsService } from './leave-requests.service';
import { LeaveRequest } from '../../entities/leave-request.entity';
import { Employee } from '../../entities/employee.entity';
import { User } from '../../entities/user.entity';
import { ApprovalRequest } from '../../entities/approval-request.entity';
import { ApprovalConfig } from '../../entities/approval-config.entity';
import { Notification } from '../../entities/notification.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LeaveRequest,
      Employee,
      User,
      ApprovalRequest,
      ApprovalConfig,
      Notification,
    ]),
  ],
  controllers: [LeaveRequestsController],
  providers: [LeaveRequestsService],
  exports: [LeaveRequestsService],
})
export class LeaveRequestsModule {}
