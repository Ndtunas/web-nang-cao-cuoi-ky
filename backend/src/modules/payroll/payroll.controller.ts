import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { PayrollService } from './payroll.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
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
}
