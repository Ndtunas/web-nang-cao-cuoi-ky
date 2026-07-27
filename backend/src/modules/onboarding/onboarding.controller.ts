import {
  Controller, Get, Post, Patch, Param, Body, UseGuards,
} from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/business-values';
import { User } from '../../entities/user.entity';
import { InitiateOnboardingDto } from './dto/initiate-onboarding.dto';

@Controller('onboarding')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  /**
   * US-15: HR Manager khởi tạo onboarding cho nhân viên mới.
   * Body có thể chứa `employee` (tạo mới) hoặc `employeeId` (nhân viên đã có).
   */
  @Post('initiate')
  @Roles(UserRole.ADMIN, UserRole.DEPT_LEAD)
  async initiate(
    @Body() dto: InitiateOnboardingDto,
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

  /**
   * US-18: Dashboard tổng hợp — pendingByDepartment + recentOnboardings.
   */
  @Get('dashboard')
  @Roles(UserRole.ADMIN, UserRole.DEPT_LEAD, UserRole.DIRECTOR, UserRole.CHAIRMAN)
  async getDashboard() {
    return this.onboardingService.getDashboard();
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

  /**
   * US-16: IT Lead (hoặc Admin) phân công / tự nhận task.
   * Body: { assigneeId?: string, selfAssign?: boolean }
   */
  @Patch('tasks/:taskId/assign')
  @Roles(UserRole.ADMIN, UserRole.DEPT_LEAD)
  async assignTask(
    @Param('taskId') taskId: string,
    @Body() dto: { assigneeId?: string; selfAssign?: boolean },
    @CurrentUser() user: User,
  ) {
    return this.onboardingService.assignTask(taskId, dto, user.id);
  }

  /**
   * US-16/17: Cập nhật trạng thái task (IN_PROGRESS / COMPLETED).
   */
  @Patch('tasks/:taskId/status')
  @Roles(UserRole.ADMIN, UserRole.DEPT_LEAD, UserRole.DIRECTOR, UserRole.CHAIRMAN)
  async updateTaskStatus(
    @Param('taskId') taskId: string,
    @Body() dto: { status: 'IN_PROGRESS' | 'COMPLETED' },
    @CurrentUser() user: User,
  ) {
    return this.onboardingService.updateTaskStatus(
      taskId,
      dto.status,
      user.id,
    );
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
