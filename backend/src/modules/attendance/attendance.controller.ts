import { Controller } from '@nestjs/common';
import { AttendanceService } from './attendance.service.js';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  // TODO: Implement endpoints theo 04_architecture.md
}
