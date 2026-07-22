import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Param,
  Delete,
} from '@nestjs/common';
import { LeaveRequestsService } from './leave-requests.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { UserRole } from '../../common/enums/business-values.js';
import { User } from '../../entities/user.entity.js';

@Controller('leave-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LeaveRequestsController {
  constructor(private readonly leaveRequestsService: LeaveRequestsService) {}

  @Post()
  @Roles(
    UserRole.EMPLOYEE,
    UserRole.DEPT_LEAD,
    UserRole.DIRECTOR,
    UserRole.CHAIRMAN,
    UserRole.ADMIN,
  )
  async submit(
    @Body() dto: { leaveType: string; startDate: string; endDate: string; reason?: string },
    @CurrentUser() user: User,
  ) {
    return this.leaveRequestsService.submitLeave(dto, user.id);
  }

  /**
   * US-24a: Lấy danh sách đơn nghỉ phép cá nhân.
   */
  @Get('my-requests')
  @Roles(
    UserRole.EMPLOYEE,
    UserRole.DEPT_LEAD,
    UserRole.DIRECTOR,
    UserRole.CHAIRMAN,
    UserRole.ADMIN,
  )
  async getMyRequests(@CurrentUser() user: User) {
    return this.leaveRequestsService.getMyLeaveRequests(user.id);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.DIRECTOR, UserRole.CHAIRMAN, UserRole.DEPT_LEAD)
  async getAll() {
    return this.leaveRequestsService.getAllLeaveRequests();
  }

  @Delete(':id')
  @Roles(
    UserRole.EMPLOYEE,
    UserRole.DEPT_LEAD,
    UserRole.DIRECTOR,
    UserRole.CHAIRMAN,
    UserRole.ADMIN,
  )
  async cancel(@Param('id') id: string, @CurrentUser() user: User) {
    return this.leaveRequestsService.cancelLeave(id, user.id);
  }
}
