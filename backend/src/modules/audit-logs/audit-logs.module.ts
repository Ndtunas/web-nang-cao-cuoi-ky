import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditLogsController } from './audit-logs.controller';
import { AuditLogsService } from './audit-logs.service';
import { SystemAuditLog } from '../../entities/system-audit-log.entity';
import { Employee } from '../../entities/employee.entity';
import { LeaveRequest } from '../../entities/leave-request.entity';
import { Timesheet } from '../../entities/timesheet.entity';
import { Department } from '../../entities/department.entity';
import { Position } from '../../entities/position.entity';
import { Project } from '../../entities/project.entity';
import { User } from '../../entities/user.entity';
import { AuditLogInterceptor } from './audit-log.interceptor';
import { LoggerModule } from '../../common/logger/logger.module';

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
