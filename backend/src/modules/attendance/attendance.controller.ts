import {
  Controller, Get, Post, Query, UseGuards,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/business-values';
import { User } from '../../entities/user.entity';

@Controller('attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('check-in')
  @Roles(
    UserRole.EMPLOYEE,
    UserRole.DEPT_LEAD,
    UserRole.DIRECTOR,
    UserRole.CHAIRMAN,
    UserRole.ADMIN,
  )
  async checkIn(@CurrentUser() user: User) {
    return this.attendanceService.checkIn(user.id);
  }

  @Post('check-out')
  @Roles(
    UserRole.EMPLOYEE,
    UserRole.DEPT_LEAD,
    UserRole.DIRECTOR,
    UserRole.CHAIRMAN,
    UserRole.ADMIN,
  )
  async checkOut(@CurrentUser() user: User) {
    return this.attendanceService.checkOut(user.id);
  }

  @Get('today')
  @Roles(
    UserRole.EMPLOYEE,
    UserRole.DEPT_LEAD,
    UserRole.DIRECTOR,
    UserRole.CHAIRMAN,
    UserRole.ADMIN,
  )
  async getToday(@CurrentUser() user: User) {
    return this.attendanceService.getToday(user.id);
  }

  /**
   * Trả về trạng thái ngày hôm nay dựa theo rule mới (cho UI cảnh báo sớm).
   */
  @Get('today-status')
  @Roles(
    UserRole.EMPLOYEE,
    UserRole.DEPT_LEAD,
    UserRole.DIRECTOR,
    UserRole.CHAIRMAN,
    UserRole.ADMIN,
  )
  async getTodayStatus(@CurrentUser() user: User) {
    return this.attendanceService.evaluateTodayAbsence(user.id);
  }

  @Get('my-history')
  @Roles(
    UserRole.EMPLOYEE,
    UserRole.DEPT_LEAD,
    UserRole.DIRECTOR,
    UserRole.CHAIRMAN,
    UserRole.ADMIN,
  )
  async getMyHistory(@CurrentUser() user: User) {
    return this.attendanceService.getMyHistory(user.id);
  }

  @Get('stats-month')
  @Roles(
    UserRole.EMPLOYEE,
    UserRole.DEPT_LEAD,
    UserRole.DIRECTOR,
    UserRole.CHAIRMAN,
    UserRole.ADMIN,
  )
  async statsMonth(
    @CurrentUser() user: User,
    @Query('month') month: number,
    @Query('year') year: number,
  ) {
    return this.attendanceService.statsMonth(user.id, Number(month), Number(year));
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.DIRECTOR, UserRole.CHAIRMAN, UserRole.DEPT_LEAD)
  async getAll(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.attendanceService.getAll(dateFrom, dateTo);
  }
}
