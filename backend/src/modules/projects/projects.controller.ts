import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ProjectsService } from './projects.service.js';
import {
  CreateProjectDto,
  UpdateProjectDto,
} from './dto/create-project.dto.js';
import {
  CreateProjectTaskDto,
  UpdateProjectTaskDto,
} from './dto/create-project-task.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '../../common/enums/business-values.js';

/**
 * Controller cho Dự án & Task
 * Ref: business/04_architecture.md mục 2.7 (Projects endpoints)
 *      timesheet/02_employee_management.md (Timesheet cần chọn Project/Task)
 */
@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  // ============== PROJECTS ==============

  @Get()
  async findAll() {
    return this.projectsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEPT_LEAD)
  async create(@Body() dto: CreateProjectDto) {
    return this.projectsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEPT_LEAD)
  async update(@Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.projectsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: string) {
    return this.projectsService.remove(id);
  }

  @Get(':id/labor-hours')
  async calculateLaborHours(@Param('id') id: string) {
    return this.projectsService.calculateTotalLaborHours(id);
  }

  // ============== TASKS ==============

  @Get(':id/tasks')
  async findTasksByProject(@Param('id') id: string) {
    return this.projectsService.findTasksByProject(id);
  }

  @Post('tasks')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEPT_LEAD)
  async createTask(@Body() dto: CreateProjectTaskDto) {
    return this.projectsService.createTask(dto);
  }

  @Patch('tasks/:taskId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEPT_LEAD)
  async updateTask(
    @Param('taskId') taskId: string,
    @Body() dto: UpdateProjectTaskDto,
  ) {
    return this.projectsService.updateTask(taskId, dto);
  }

  @Delete('tasks/:taskId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async removeTask(@Param('taskId') taskId: string) {
    return this.projectsService.removeTask(taskId);
  }
}
