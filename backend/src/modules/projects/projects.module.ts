import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { Project } from '../../entities/project.entity';
import { ProjectTask } from '../../entities/project-task.entity';
import { TimesheetEntry } from '../../entities/timesheet-entry.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Project, ProjectTask, TimesheetEntry])],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
