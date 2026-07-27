// --- jest setup ---
// Suppress raw SQL console noise from TypeORM
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'warn').mockImplementation(() => {});

// Import test utilities
const { MockRepository } = require('../../test/utils/mock-repository');

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { Project } from '../../entities/project.entity';
import { ProjectTask } from '../../entities/project-task.entity';
import { TimesheetEntry } from '../../entities/timesheet-entry.entity';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let projectRepo: any;
  let taskRepo: any;
  let timesheetEntryRepo: any;

  beforeEach(async () => {
    projectRepo = new MockRepository();
    taskRepo = new MockRepository();
    timesheetEntryRepo = new MockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        {
          provide: getRepositoryToken(Project),
          useValue: projectRepo,
        },
        {
          provide: getRepositoryToken(ProjectTask),
          useValue: taskRepo,
        },
        {
          provide: getRepositoryToken(TimesheetEntry),
          useValue: timesheetEntryRepo,
        },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all projects', async () => {
      const mockProjects = [{ id: '1', name: 'Project A' }];
      projectRepo.find = jest.fn().mockResolvedValue(mockProjects);

      const result = await service.findAll();

      expect(projectRepo.find).toHaveBeenCalled();
      expect(result).toEqual(mockProjects);
    });

    it('should return empty array when no projects', async () => {
      projectRepo.find = jest.fn().mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a project when found', async () => {
      const mockProject = { id: '1', name: 'Internal HRM' };
      projectRepo.findOne = jest.fn().mockResolvedValue(mockProject);

      const result = await service.findOne('1');

      expect(projectRepo.findOne).toHaveBeenCalledWith({ where: { id: '1' }, relations: { pm: true } });
      expect(result).toEqual(mockProject);
    });

    it('should throw NotFoundException when project not found', async () => {
      projectRepo.findOne = jest.fn().mockResolvedValue(null);

      await expect(service.findOne('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a project and return it', async () => {
      const dto = { name: 'New Project', startDate: '2026-01-01' };
      const mockCreated = { id: '123', name: 'New Project', startDate: new Date('2026-01-01') };

      projectRepo.create = jest.fn().mockReturnValue(dto);
      projectRepo.save = jest.fn().mockResolvedValue({ id: '123', ...dto });
      projectRepo.findOne = jest.fn().mockResolvedValue(mockCreated);

      const result = await service.create(dto);

      expect(projectRepo.save).toHaveBeenCalled();
      expect(result).toMatchObject({ id: '123', name: 'New Project' });
    });
  });

  describe('update', () => {
    it('should update a project and return the updated entity', async () => {
      const existingProject = { id: '1', name: 'Old Name', pm: null };
      const dto = { name: 'New Name' };
      const updatedProject = { ...existingProject, ...dto };

      projectRepo.findOne = jest.fn().mockResolvedValue({ ...existingProject });
      projectRepo.save = jest.fn().mockResolvedValue(updatedProject);

      const result = await service.update('1', dto);

      expect(projectRepo.findOne).toHaveBeenCalledWith({ where: { id: '1' }, relations: { pm: true } });
      expect(projectRepo.save).toHaveBeenCalled();
      expect(result.name).toBe('New Name');
    });

    it('should throw NotFoundException when project not found for update', async () => {
      projectRepo.findOne = jest.fn().mockResolvedValue(null);

      await expect(service.update('999', { name: 'New Name' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a project and return { success: true }', async () => {
      projectRepo.findOne = jest.fn().mockResolvedValue({ id: '1', name: 'Project' });
      projectRepo.remove = jest.fn().mockResolvedValue({ id: '1', name: 'Project' });

      const result = await service.remove('1');

      expect(projectRepo.remove).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    it('should throw NotFoundException when project not found for remove', async () => {
      projectRepo.findOne = jest.fn().mockResolvedValue(null);

      await expect(service.remove('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('calculateTotalLaborHours', () => {
    it('should return total hours from query builder', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ totallahours: '120', entrycount: '5' }),
      };
      timesheetEntryRepo.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

      const result = await service.calculateTotalLaborHours('1');

      expect(timesheetEntryRepo.createQueryBuilder).toHaveBeenCalledWith('entry');
      expect(mockQueryBuilder.select).toHaveBeenCalledWith('SUM(entry.hoursSpent)', 'totalHours');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('entry.projectId = :projectId', { projectId: '1' });
      expect(result).toEqual({ projectId: '1', totalHours: 120, entryCount: 5 });
    });

    it('should return 0 totalHours when no entries exist', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ totallahours: null, entrycount: '0' }),
      };
      timesheetEntryRepo.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

      const result = await service.calculateTotalLaborHours('1');

      expect(result.totalHours).toBe(0);
    });
  });

  describe('findTasksByProject', () => {
    it('should return tasks ordered by taskName ASC', async () => {
      const mockTasks = [{ id: '1', taskName: 'Task A' }];
      taskRepo.find = jest.fn().mockResolvedValue(mockTasks);

      const result = await service.findTasksByProject('1');

      expect(taskRepo.find).toHaveBeenCalledWith({ where: { projectId: '1' }, order: { taskName: 'ASC' } });
      expect(result).toEqual(mockTasks);
    });
  });

  describe('findAllTasks', () => {
    it('should return all tasks', async () => {
      const mockTasks = [{ id: '1', taskName: 'Task A' }];
      taskRepo.find = jest.fn().mockResolvedValue(mockTasks);

      const result = await service.findAllTasks();

      expect(taskRepo.find).toHaveBeenCalled();
      expect(result).toEqual(mockTasks);
    });

    it('should return empty array when no tasks', async () => {
      taskRepo.find = jest.fn().mockResolvedValue([]);

      const result = await service.findAllTasks();

      expect(result).toEqual([]);
    });
  });

  describe('findTask', () => {
    it('should return a task when found', async () => {
      const mockTask = { id: '1', taskName: 'Task A' };
      taskRepo.findOne = jest.fn().mockResolvedValue(mockTask);

      const result = await service.findTask('1');

      expect(taskRepo.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(result).toEqual(mockTask);
    });

    it('should throw NotFoundException when task not found', async () => {
      taskRepo.findOne = jest.fn().mockResolvedValue(null);

      await expect(service.findTask('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createTask', () => {
    it('should create a task and return it with id', async () => {
      const dto = { projectId: '1', taskName: 'New Task', estimatedHours: 20 };
      const mockCreated = { id: '123', ...dto };

      projectRepo.findOne = jest.fn().mockResolvedValue({ id: '1', name: 'Project' });
      taskRepo.save = jest.fn().mockResolvedValue(mockCreated);

      const result = await service.createTask(dto);

      expect(taskRepo.save).toHaveBeenCalled();
      expect(result).toMatchObject({ id: '123', taskName: 'New Task' });
    });
  });

  describe('updateTask', () => {
    it('should update a task and return the updated entity', async () => {
      const existingTask = { id: '1', taskName: 'Old Task' };
      const dto = { taskName: 'Updated Task' };
      const updatedTask = { ...existingTask, ...dto };

      taskRepo.findOne = jest.fn().mockResolvedValue({ ...existingTask });
      taskRepo.save = jest.fn().mockResolvedValue(updatedTask);

      const result = await service.updateTask('1', dto);

      expect(taskRepo.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(taskRepo.save).toHaveBeenCalled();
      expect(result.taskName).toBe('Updated Task');
    });

    it('should throw NotFoundException when task not found for update', async () => {
      taskRepo.findOne = jest.fn().mockResolvedValue(null);

      await expect(service.updateTask('999', { taskName: 'New Name' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeTask', () => {
    it('should delete a task and return { success: true }', async () => {
      taskRepo.findOne = jest.fn().mockResolvedValue({ id: '1', taskName: 'Task' });
      taskRepo.remove = jest.fn().mockResolvedValue({ id: '1', taskName: 'Task' });

      const result = await service.removeTask('1');

      expect(taskRepo.remove).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    it('should throw NotFoundException when task not found for remove', async () => {
      taskRepo.findOne = jest.fn().mockResolvedValue(null);

      await expect(service.removeTask('999')).rejects.toThrow(NotFoundException);
    });
  });
});
