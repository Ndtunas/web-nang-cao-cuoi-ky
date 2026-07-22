import {
  Controller, Get, Post, Patch, Delete, Body, Param, UseGuards,
} from '@nestjs/common';
import { PositionsService } from './positions.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '../../common/enums/business-values.js';

@Controller('positions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PositionsController {
  constructor(private readonly positionsService: PositionsService) {}

  @Get()
  @Roles(
    UserRole.ADMIN, UserRole.DIRECTOR, UserRole.CHAIRMAN,
    UserRole.DEPT_LEAD, UserRole.EMPLOYEE,
  )
  async findAll() {
    return this.positionsService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.DIRECTOR, UserRole.CHAIRMAN, UserRole.DEPT_LEAD)
  async findOne(@Param('id') id: string) {
    return this.positionsService.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  async create(@Body() dto: { title: string; baseSalaryRatio: number; description?: string }) {
    return this.positionsService.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() dto: { title?: string; baseSalaryRatio?: number; description?: string },
  ) {
    return this.positionsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: string) {
    return this.positionsService.remove(id);
  }
}
