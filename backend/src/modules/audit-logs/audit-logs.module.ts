import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditLogsController } from './audit-logs.controller.js';
import { AuditLogsService } from './audit-logs.service.js';
import { SystemAuditLog } from '../../entities/system-audit-log.entity.js';
import { Employee } from '../../entities/employee.entity.js';
import { LeaveRequest } from '../../entities/leave-request.entity.js';
import { Timesheet } from '../../entities/timesheet.entity.js';
import { Department } from '../../entities/department.entity.js';
import { Position } from '../../entities/position.entity.js';
import { Project } from '../../entities/project.entity.js';
import { User } from '../../entities/user.entity.js';
import { AuditLogInterceptor } from './audit-log.interceptor.js';
import { LoggerModule } from '../../common/logger/logger.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SystemAuditLog,
      Employee,
      LeaveRequest,
      Timesheet,
      Department,
      Position,
      Project,
      User,
    ]),
    LoggerModule,
  ],
  controllers: [AuditLogsController],
  providers: [
    AuditLogsService,
    AuditLogInterceptor,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
  ],
  exports: [AuditLogsService],
})
export class AuditLogsModule {}
