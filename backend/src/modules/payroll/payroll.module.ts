import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PayrollController } from './payroll.controller.js';
import { PayrollService } from './payroll.service.js';
import { Salary } from '../../entities/salary.entity.js';
import { Employee } from '../../entities/employee.entity.js';
import { WorkRateConfig } from '../../entities/work-rate-config.entity.js';
import { Timesheet } from '../../entities/timesheet.entity.js';
import { TimesheetEntry } from '../../entities/timesheet-entry.entity.js';
import { ApprovalRequest } from '../../entities/approval-request.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Salary,
      Employee,
      WorkRateConfig,
      Timesheet,
      TimesheetEntry,
      ApprovalRequest,
    ]),
  ],
  controllers: [PayrollController],
  providers: [PayrollService],
  exports: [PayrollService],
})
export class PayrollModule {}
