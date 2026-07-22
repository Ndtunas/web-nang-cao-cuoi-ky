import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditLogsController } from './audit-logs.controller.js';
import { AuditLogsService } from './audit-logs.service.js';
import { SystemAuditLog } from '../../entities/system-audit-log.entity.js';
import { AuditLogInterceptor } from './audit-log.interceptor.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([SystemAuditLog])
  ],
  controllers: [AuditLogsController],
  providers: [
    AuditLogsService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    }
  ],
  exports: [AuditLogsService],
})
export class AuditLogsModule {}
