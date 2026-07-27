import {
  Controller, Get, Post, Patch, Delete, Body, Param, UseGuards,
} from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../common/enums/business-values';

@Controller('departments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  @Roles(
    UserRole.ADMIN, UserRole.DIRECTOR, UserRole.CHAIRMAN,
    UserRole.DEPT_LEAD, UserRole.EMPLOYEE,
  )
  async findAll() {
    return this.departmentsService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.DIRECTOR, UserRole.CHAIRMAN, UserRole.DEPT_LEAD)
  async findOne(@Param('id') id: string) {
    return this.departmentsService.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  async create(@Body() dto: { deptCode: string; name: string; description?: string; managerId?: string }) {
    return this.departmentsService.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() dto: { name?: string; description?: string; managerId?: string | null },
  ) {
    return this.departmentsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: string) {
    return this.departmentsService.remove(id);
  }
}
