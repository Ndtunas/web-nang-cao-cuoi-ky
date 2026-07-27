import {
  Controller, Get, Post, Param, Body, UseGuards, Patch,
} from '@nestjs/common';
import { OffboardingService } from './offboarding.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/business-values';
import { User } from '../../entities/user.entity';

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

  /**
   * US-21: Lấy task theo phòng ban của requester (HR/IT/ADMIN).
   */
  @Get('tasks/my-department')
  @Roles(
    UserRole.EMPLOYEE,
    UserRole.DEPT_LEAD,
    UserRole.DIRECTOR,
    UserRole.CHAIRMAN,
    UserRole.ADMIN,
  )
  async getTasksByMyDepartment(@CurrentUser() user: User) {
    return this.offboardingService.getTasksForRequesterDepartment(user.id);
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

  /**
   * US-22: Quyết toán + chốt TERMINATED. HR/Admin only.
   */
  @Post('final-settlement')
  @Roles(UserRole.ADMIN, UserRole.DEPT_LEAD)
  async finalSettlement(
    @Body()
    dto: {
      employeeId: string;
      lastWorkingDay: string;
      unusedLeaveDays: number;
      severanceAmount: number;
    },
  ) {
    return this.offboardingService.finalSettlement(dto);
  }
}
