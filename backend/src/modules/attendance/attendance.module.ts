import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { AttendanceCronService } from './attendance.cron';
import { Attendance } from '../../entities/attendance.entity';
import { Employee } from '../../entities/employee.entity';

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