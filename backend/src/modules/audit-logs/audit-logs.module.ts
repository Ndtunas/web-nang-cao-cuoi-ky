import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogsController } from './audit-logs.controller.js';
import { AuditLogsService } from './audit-logs.service.js';
import { SystemAuditLog } from '../../entities/system-audit-log.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([SystemAuditLog])
  ],
  controllers: [AuditLogsController],
  providers: [AuditLogsService],
  exports: [AuditLogsService],
})
export class AuditLogsModule {}
