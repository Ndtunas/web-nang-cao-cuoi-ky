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

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Timesheet,
      TimesheetEntry,
      Employee,
      ApprovalRequest,
      Project,
      ProjectTask
    ])
  ],
  controllers: [TimesheetsController],
  providers: [TimesheetsService],
  exports: [TimesheetsService],
})
export class TimesheetsModule {}
