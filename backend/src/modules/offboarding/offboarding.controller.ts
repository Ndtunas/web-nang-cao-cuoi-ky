import {
  Controller, Get, Post, Param, Body, UseGuards, Patch,
} from '@nestjs/common';
import { OffboardingService } from './offboarding.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { UserRole } from '../../common/enums/business-values.js';
import { User } from '../../entities/user.entity.js';

@Controller('offboarding')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OffboardingController {
  constructor(private readonly offboardingService: OffboardingService) {}

  /**
   * US-19/20: Nhân viên nộp đơn thôi việc → kích hoạt 3-level approval.
   */
  @Post('resignation-request')
  @Roles(
    UserRole.EMPLOYEE,
    UserRole.DEPT_LEAD,
    UserRole.DIRECTOR,
    UserRole.CHAIRMAN,
    UserRole.ADMIN,
  )
  async resign(
    @Body() dto: { reason: string },
    @CurrentUser() user: User,
  ) {
    return this.offboardingService.submitResignation(dto.reason || '', user.id);
  }

  @Get('tasks/:employeeId')
  @Roles(
    UserRole.ADMIN,
    UserRole.DIRECTOR,
    UserRole.CHAIRMAN,
    UserRole.DEPT_LEAD,
  )
  async getTasks(@Param('employeeId') employeeId: string) {
    return this.offboardingService.getTasksByEmployee(employeeId);
  }

  @Get('tasks')
  @Roles(
    UserRole.ADMIN,
    UserRole.DIRECTOR,
    UserRole.CHAIRMAN,
    UserRole.DEPT_LEAD,
  )
  async getAllPendingTasks() {
    return this.offboardingService.getAllPendingTasks();
  }

  @Patch('tasks/:taskId/complete')
  @Roles(
    UserRole.ADMIN,
    UserRole.DIRECTOR,
    UserRole.CHAIRMAN,
    UserRole.DEPT_LEAD,
  )
  async completeTask(
    @Param('taskId') taskId: string,
    @CurrentUser() user: User,
  ) {
    return this.offboardingService.completeTask(taskId, user.id);
  }

  @Get('check-completed/:employeeId')
  @Roles(
    UserRole.ADMIN,
    UserRole.DIRECTOR,
    UserRole.CHAIRMAN,
    UserRole.DEPT_LEAD,
  )
  async checkCompleted(@Param('employeeId') employeeId: string) {
    const done = await this.offboardingService.checkAllCompleted(employeeId);
    return { allCompleted: done };
  }
}
