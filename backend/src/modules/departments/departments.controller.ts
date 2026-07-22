import { Controller, Get, UseGuards } from '@nestjs/common';
import { DepartmentsService } from './departments.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@Controller('departments')
@UseGuards(JwtAuthGuard)
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  async findAll() {
    return this.departmentsService.findAll();
  }
}
