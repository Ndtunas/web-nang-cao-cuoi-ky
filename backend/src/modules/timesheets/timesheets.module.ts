import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TimesheetsController } from './timesheets.controller.js';
import { TimesheetsService } from './timesheets.service.js';
import { Timesheet } from '../../entities/timesheet.entity.js';
import { TimesheetEntry } from '../../entities/timesheet-entry.entity.js';
import { Employee } from '../../entities/employee.entity.js';
import { ApprovalRequest } from '../../entities/approval-request.entity.js';
import { Project } from '../../entities/project.entity.js';
import { ProjectTask } from '../../entities/project-task.entity.js';
import { Attendance } from '../../entities/attendance.entity.js';
import { WorkRateConfig } from '../../entities/work-rate-config.entity.js';
import { LoggerModule } from '../../common/logger/logger.module.js';
import { ApprovalModule } from '../approval/approval.module.js';
import { AttendanceModule } from '../attendance/attendance.module.js';

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