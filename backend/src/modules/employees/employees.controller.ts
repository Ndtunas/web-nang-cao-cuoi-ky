import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { EmployeesService } from './employees.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { User } from '../../entities/user.entity.js';
import { UserRole } from '../../common/enums/business-values.js';

@Controller('employees')
@UseGuards(JwtAuthGuard)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  async findAll() {
    return this.employeesService.findAll();
  }

  @Get('stats')
  async getStats() {
    return this.employeesService.getStats();
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEPT_LEAD)
  async create(@Body() dto: any) {
    return this.employeesService.create(dto);
  }

  @Patch(':id/personal-info')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEPT_LEAD)
  async updatePersonalInfo(@Param('id') id: string, @Body() dto: any) {
    return this.employeesService.updatePersonalInfo(id, dto);
  }

  @Post('job-transfers')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEPT_LEAD)
  async submitJobTransfer(@Body() dto: any, @CurrentUser() user: User) {
    return this.employeesService.submitJobTransfer(dto, user.id);
  }

  @Post('salary-adjustments')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEPT_LEAD)
  async submitSalaryAdjustment(@Body() dto: any, @CurrentUser() user: User) {
    return this.employeesService.submitSalaryAdjustment(dto, user.id);
  }

  @Get(':id/job-history')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEPT_LEAD)
  async getJobHistory(@Param('id') id: string) {
    return this.employeesService.getJobHistory(id);
  }

  @Get(':id/salary-history')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEPT_LEAD)
  async getSalaryHistory(@Param('id') id: string) {
    return this.employeesService.getSalaryHistory(id);
  }

  @Post('discipline-rewards')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEPT_LEAD)
  async submitDisciplineReward(@Body() dto: any, @CurrentUser() user: User) {
    return this.employeesService.submitDisciplineReward(dto, user.id);
  }

  @Patch(':id/promote')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEPT_LEAD)
  async promoteToOfficial(@Param('id') id: string) {
    return this.employeesService.promoteToOfficial(id);
  }
}
