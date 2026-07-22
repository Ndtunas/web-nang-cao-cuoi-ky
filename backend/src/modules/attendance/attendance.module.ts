import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AttendanceController } from './attendance.controller.js';
import { AttendanceService } from './attendance.service.js';
import { AttendanceCronService } from './attendance.cron.js';
import { Attendance } from '../../entities/attendance.entity.js';
import { Employee } from '../../entities/employee.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Attendance, Employee]),
    ScheduleModule.forRoot(),
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService, AttendanceCronService],
  exports: [AttendanceService, AttendanceCronService],
})
export class AttendanceModule {}