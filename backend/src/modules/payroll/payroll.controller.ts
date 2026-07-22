import { Controller, Get, Post, Patch, Body, Query, UseGuards } from '@nestjs/common';
import { PayrollService } from './payroll.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { UserRole } from '../../common/enums/business-values.js';

@Controller('payroll')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Post('calculate-monthly')
  @Roles(UserRole.ADMIN, UserRole.DIRECTOR, UserRole.CHAIRMAN)
  async calculateMonthly(@Body() dto: { month: number; year: number }) {
    return this.payrollService.calculateMonthly(dto);
  }

  @Get('salaries')
  @Roles(UserRole.ADMIN, UserRole.DIRECTOR, UserRole.CHAIRMAN)
  async getSalaries(
    @Query('month') month: number,
    @Query('year') year: number,
  ) {
    return this.payrollService.getSalaries(Number(month), Number(year));
  }

  /**
   * US-25: Chốt bảng lương tháng (2-cấp duyệt cuối) → set tất cả Salary trong tháng APPROVED.
   * Body: { month, year, comment }
   * Auth: ADMIN/DIRECTOR/CHAIRMAN (per spec 04_architecture.md mục 2.4)
   */
  @Patch('approve')
  @Roles(UserRole.ADMIN, UserRole.DIRECTOR, UserRole.CHAIRMAN)
  async approveMonthly(
    @Body() dto: { month: number; year: number; comment?: string },
  ) {
    return this.payrollService.approveMonthly(dto);
  }

  /**
   * US-26: Nhân viên xem phiếu lương cá nhân theo tháng.
   * Query: ?month=&year=
   */
  @Get('my-payslip')
  @Roles(
    UserRole.EMPLOYEE,
    UserRole.DEPT_LEAD,
    UserRole.DIRECTOR,
    UserRole.CHAIRMAN,
    UserRole.ADMIN,
  )
  async getMyPayslip(
    @CurrentUser() user: { id: string },
    @Query('month') month: number,
    @Query('year') year: number,
  ) {
    return this.payrollService.getMyPayslip(user.id, Number(month), Number(year));
  }
}
