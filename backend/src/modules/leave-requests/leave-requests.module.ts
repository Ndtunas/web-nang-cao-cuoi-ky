import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeaveRequestsController } from './leave-requests.controller.js';
import { LeaveRequestsService } from './leave-requests.service.js';
import { LeaveRequest } from '../../entities/leave-request.entity.js';
import { Employee } from '../../entities/employee.entity.js';
import { User } from '../../entities/user.entity.js';
import { ApprovalRequest } from '../../entities/approval-request.entity.js';
import { ApprovalConfig } from '../../entities/approval-config.entity.js';
import { Notification } from '../../entities/notification.entity.js';

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
