import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditLogsController } from './audit-logs.controller.js';
import { AuditLogsService } from './audit-logs.service.js';
import { SystemAuditLog } from '../../entities/system-audit-log.entity.js';
import { AuditLogInterceptor } from './audit-log.interceptor.js';
import { LoggerModule } from '../../common/logger/logger.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([SystemAuditLog]), LoggerModule],
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
