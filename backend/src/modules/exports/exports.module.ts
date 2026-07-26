import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExportsController } from './exports.controller.js';
import { ExportsService } from './exports.service.js';
import { Employee } from '../../entities/employee.entity.js';
import { Salary } from '../../entities/salary.entity.js';
import { Timesheet } from '../../entities/timesheet.entity.js';
import { TimesheetEntry } from '../../entities/timesheet-entry.entity.js';
import { LeaveRequest } from '../../entities/leave-request.entity.js';
import { AuditLogsModule } from '../audit-logs/audit-logs.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Employee,
      Salary,
      Timesheet,
      TimesheetEntry,
      LeaveRequest,
    ]),
    AuditLogsModule,
  ],
  controllers: [ExportsController],
  providers: [ExportsService],
  exports: [ExportsService],
})
export class ExportsModule {}