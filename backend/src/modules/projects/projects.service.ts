import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../../entities/project.entity.js';
import { ProjectTask } from '../../entities/project-task.entity.js';
import { TimesheetEntry } from '../../entities/timesheet-entry.entity.js';
import {
  CreateProjectDto,
  UpdateProjectDto,
} from './dto/create-project.dto.js';
import {
  CreateProjectTaskDto,
  UpdateProjectTaskDto,
} from './dto/create-project-task.dto.js';

/**
 * Service quản lý Dự án & Task thuộc dự án
 * Ref: business/02_domain_model.md mục 1.4 (Project) & 1.5 (ProjectTask)
 *      business/04_architecture.md mục 2.7 endpoints
 */
@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(ProjectTask)
    private readonly projectTaskRepository: Repository<ProjectTask>,
    @InjectRepository(TimesheetEntry)
    private readonly timesheetEntryRepository: Repository<TimesheetEntry>,
  ) {}

  // ============== PROJECT CRUD ==============

  async findAll(): Promise<Project[]> {
    return this.projectRepository.find({
      relations: { pm: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id },
      relations: { pm: true },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async create(dto: CreateProjectDto): Promise<Project> {
    const createInput: Partial<Project> = {
      name: dto.name,
      startDate: new Date(dto.startDate),
      status: dto.status || 'ACTIVE',
    };
    if (dto.endDate) createInput.endDate = new Date(dto.endDate);
    if (dto.pmId) createInput.pmId = dto.pmId;

    const project = this.projectRepository.create(createInput);
    const saved = await this.projectRepository.save(project);
    return this.findOne(saved.id);
  }

  async update(id: string, dto: UpdateProjectDto): Promise<Project> {
    const project = await this.findOne(id);
    if (dto.name !== undefined) project.name = dto.name;
    if (dto.startDate !== undefined)
      project.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) {
      project.endDate = dto.endDate ? new Date(dto.endDate) : (null as any);
    }
    if (dto.pmId !== undefined) {
      project.pmId = (dto.pmId || null) as any;
    }
    if (dto.status !== undefined) project.status = dto.status;
    await this.projectRepository.save(project);
    return this.findOne(id);
  }

  async remove(id: string): Promise<{ success: boolean }> {
    const project = await this.findOne(id);
    await this.projectRepository.remove(project);
    return { success: true };
  }

  /**
   * Tính tổng số giờ labor đã khai báo cho dự án (qua timesheet_entries)
   * Ref: business/02_domain_model.md §1.4 phương thức calculateTotalLaborHours()
   */
  async calculateTotalLaborHours(
    projectId: string,
  ): Promise<{ projectId: string; totalHours: number; entryCount: number }> {
    const result = await this.timesheetEntryRepository
      .createQueryBuilder('entry')
      .select('SUM(entry.hoursSpent)', 'totalHours')
      .addSelect('COUNT(*)', 'entryCount')
      .where('entry.projectId = :projectId', { projectId })
      .getRawOne();

    return {
      projectId,
      totalHours: parseFloat(result?.totallahours || '0'),
      entryCount: parseInt(result?.entrycount || '0', 10),
    };
  }

  // ============== PROJECT_TASK CRUD ==============

  async findTasksByProject(projectId: string): Promise<ProjectTask[]> {
    return this.projectTaskRepository.find({
      where: { projectId },
      order: { taskName: 'ASC' },
    });
  }

  async findAllTasks(): Promise<ProjectTask[]> {
    return this.projectTaskRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findTask(taskId: string): Promise<ProjectTask> {
    const task = await this.projectTaskRepository.findOne({
      where: { id: taskId },
    });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async createTask(dto: CreateProjectTaskDto): Promise<ProjectTask> {
    // Verify project exists
    await this.findOne(dto.projectId);

    const createInput: Partial<ProjectTask> = {
      projectId: dto.projectId,
      taskName: dto.taskName,
      estimatedHours: dto.estimatedHours || 0,
    };
    if (dto.description !== undefined) {
      createInput.description = dto.description || (null as any);
    }
    const task = this.projectTaskRepository.create(createInput);
    return this.projectTaskRepository.save(task);
  }

  async updateTask(
    taskId: string,
    dto: UpdateProjectTaskDto,
  ): Promise<ProjectTask> {
    const task = await this.findTask(taskId);
    if (dto.taskName !== undefined) task.taskName = dto.taskName;
    if (dto.description !== undefined)
      task.description = (dto.description || null) as any;
    if (dto.estimatedHours !== undefined)
      task.estimatedHours = dto.estimatedHours;
    return this.projectTaskRepository.save(task);
  }

  async removeTask(taskId: string): Promise<{ success: boolean }> {
    const task = await this.findTask(taskId);
    await this.projectTaskRepository.remove(task);
    return { success: true };
  }
}
