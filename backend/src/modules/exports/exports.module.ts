import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExportsController } from './exports.controller';
import { ExportsService } from './exports.service';
import { Employee } from '../../entities/employee.entity';
import { Salary } from '../../entities/salary.entity';
import { Timesheet } from '../../entities/timesheet.entity';
import { TimesheetEntry } from '../../entities/timesheet-entry.entity';
import { LeaveRequest } from '../../entities/leave-request.entity';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

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