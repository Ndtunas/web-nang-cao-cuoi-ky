import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { PayrollService } from './payroll.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@Controller('payroll')
@UseGuards(JwtAuthGuard)
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Post('calculate-monthly')
  async calculateMonthly(@Body() dto: { month: number; year: number }) {
    return this.payrollService.calculateMonthly(dto);
  }

  @Get('salaries')
  async getSalaries(@Query('month') month: number, @Query('year') year: number) {
    return this.payrollService.getSalaries(Number(month), Number(year));
  }
}
