import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { EmployeesService } from './employees.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { User } from '../../entities/user.entity.js';

@Controller('employees')
@UseGuards(JwtAuthGuard)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  async findAll() {
    return this.employeesService.findAll();
  }

  @Post()
  async create(@Body() dto: any) {
    return this.employeesService.create(dto);
  }

  @Patch(':id/personal-info')
  async updatePersonalInfo(@Param('id') id: string, @Body() dto: any) {
    return this.employeesService.updatePersonalInfo(id, dto);
  }

  @Post('job-transfers')
  async submitJobTransfer(@Body() dto: any, @CurrentUser() user: User) {
    return this.employeesService.submitJobTransfer(dto, user.id);
  }

  @Post('salary-adjustments')
  async submitSalaryAdjustment(@Body() dto: any, @CurrentUser() user: User) {
    return this.employeesService.submitSalaryAdjustment(dto, user.id);
  }
}
