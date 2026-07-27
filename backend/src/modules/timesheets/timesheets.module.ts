import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TimesheetsController } from './timesheets.controller';
import { TimesheetsService } from './timesheets.service';
import { Timesheet } from '../../entities/timesheet.entity';
import { TimesheetEntry } from '../../entities/timesheet-entry.entity';
import { Employee } from '../../entities/employee.entity';
import { ApprovalRequest } from '../../entities/approval-request.entity';
import { Project } from '../../entities/project.entity';
import { ProjectTask } from '../../entities/project-task.entity';
import { Attendance } from '../../entities/attendance.entity';
import { WorkRateConfig } from '../../entities/work-rate-config.entity';
import { LoggerModule } from '../../common/logger/logger.module';
import { ApprovalModule } from '../approval/approval.module';
import { AttendanceModule } from '../attendance/attendance.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Timesheet,
      TimesheetEntry,
      Employee,
      ApprovalRequest,
      Project,
      ProjectTask,
      Attendance,
      WorkRateConfig,
    ]),
    LoggerModule,
    ApprovalModule,
    AttendanceModule,
  ],
  controllers: [TimesheetsController],
  providers: [TimesheetsService],
  exports: [TimesheetsService],
})
export class TimesheetsModule {}