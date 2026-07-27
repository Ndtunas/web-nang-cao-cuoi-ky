import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';
import { Salary } from '../../entities/salary.entity';
import { Employee } from '../../entities/employee.entity';
import { WorkRateConfig } from '../../entities/work-rate-config.entity';
import { Timesheet } from '../../entities/timesheet.entity';
import { TimesheetEntry } from '../../entities/timesheet-entry.entity';
import { ApprovalRequest } from '../../entities/approval-request.entity';

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
