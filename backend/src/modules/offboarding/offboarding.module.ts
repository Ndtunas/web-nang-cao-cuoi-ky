import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OffboardingController } from './offboarding.controller.js';
import { OffboardingService } from './offboarding.service.js';
import { OffboardingTask } from '../../entities/offboarding-task.entity.js';
import { Employee } from '../../entities/employee.entity.js';
import { User } from '../../entities/user.entity.js';
import { ApprovalRequest } from '../../entities/approval-request.entity.js';
import { ApprovalConfig } from '../../entities/approval-config.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OffboardingTask,
      Employee,
      User,
      ApprovalRequest,
      ApprovalConfig,
    ]),
  ],
  controllers: [OffboardingController],
  providers: [OffboardingService],
  exports: [OffboardingService],
})
export class OffboardingModule {}
