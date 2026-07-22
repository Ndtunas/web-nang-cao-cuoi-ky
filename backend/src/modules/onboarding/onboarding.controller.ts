import {
  Controller, Get, Post, Patch, Param, Body, UseGuards,
} from '@nestjs/common';
import { OnboardingService } from './onboarding.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { UserRole } from '../../common/enums/business-values.js';
import { User } from '../../entities/user.entity.js';

@Controller('onboarding')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  /**
   * US-15: HR Manager khởi tạo onboarding cho nhân viên mới.
   */
  @Post('initiate')
  @Roles(UserRole.ADMIN, UserRole.DEPT_LEAD)
  async initiate(
    @Body() dto: { employeeId: string; dueDate?: string },
    @CurrentUser() user: User,
  ) {
    return this.onboardingService.initiateOnboarding(dto, user.id);
  }

  /**
   * US-18: Lấy tất cả tasks đang pending cho dashboard HR.
   */
  @Get('tasks')
  @Roles(UserRole.ADMIN, UserRole.DEPT_LEAD, UserRole.DIRECTOR, UserRole.CHAIRMAN)
  async getAllPending() {
    return this.onboardingService.getAllPendingTasks();
  }

  @Get('tasks/:department')
  @Roles(UserRole.ADMIN, UserRole.DEPT_LEAD, UserRole.DIRECTOR, UserRole.CHAIRMAN)
  async getByDepartment(@Param('department') dept: string) {
    return this.onboardingService.getTasksForDepartment(dept.toUpperCase());
  }

  @Get('employee/:employeeId')
  @Roles(UserRole.ADMIN, UserRole.DEPT_LEAD)
  async getByEmployee(@Param('employeeId') employeeId: string) {
    return this.onboardingService.getTasksByEmployee(employeeId);
  }

  @Patch('tasks/:taskId/complete')
  @Roles(UserRole.ADMIN, UserRole.DEPT_LEAD, UserRole.DIRECTOR, UserRole.CHAIRMAN)
  async complete(
    @Param('taskId') taskId: string,
    @CurrentUser() user: User,
  ) {
    return this.onboardingService.completeTask(taskId, user.id);
  }

  /**
   * US-18: Promote nhân viên từ ONBOARDING/PROBATION → OFFICIAL.
   */
  @Patch('promote/:employeeId')
  @Roles(UserRole.ADMIN, UserRole.DEPT_LEAD)
  async promote(@Param('employeeId') employeeId: string) {
    return this.onboardingService.promoteToOfficial(employeeId);
  }
}
