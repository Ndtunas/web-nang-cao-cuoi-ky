import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { createProject, createProjectTask } from '../../test/utils/mock-entities';

describe('ProjectsController', () => {
  let controller: ProjectsController;
  let service: jest.Mocked<ProjectsService>;

  const mockService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    calculateTotalLaborHours: jest.fn(),
    findTasksByProject: jest.fn(),
    createTask: jest.fn(),
    updateTask: jest.fn(),
    removeTask: jest.fn(),
  };

  const project = createProject();
  const task = createProjectTask();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [{ provide: ProjectsService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ProjectsController>(ProjectsController);
    service = module.get(ProjectsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('GET /projects', () => {
    it('should return all projects', async () => {
      mockService.findAll.mockResolvedValue([project]);
      expect(await controller.findAll()).toEqual([project]);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('GET /projects/:id', () => {
    it('should return one project', async () => {
      mockService.findOne.mockResolvedValue(project);
      expect(await controller.findOne('1')).toEqual(project);
      expect(service.findOne).toHaveBeenCalledWith('1');
    });
  });

  describe('POST /projects', () => {
    it('should create project', async () => {
      const dto = { name: 'New Project', startDate: '2026-01-01' };
      mockService.create.mockResolvedValue(project);
      expect(await controller.create(dto)).toEqual(project);
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('PATCH /projects/:id', () => {
    it('should update project', async () => {
      const dto = { name: 'Updated Project' };
      mockService.update.mockResolvedValue({ ...project, name: 'Updated Project' });
      expect(await controller.update('1', dto)).toBeDefined();
      expect(service.update).toHaveBeenCalledWith('1', dto);
    });
  });

  describe('DELETE /projects/:id', () => {
    it('should remove project', async () => {
      mockService.remove.mockResolvedValue({ removed: true });
      expect(await controller.remove('1')).toEqual({ removed: true });
      expect(service.remove).toHaveBeenCalledWith('1');
    });
  });

  describe('GET /projects/:id/labor-hours', () => {
    it('should return labor hours', async () => {
      mockService.calculateTotalLaborHours.mockResolvedValue(120);
      expect(await controller.calculateLaborHours('1')).toEqual(120);
      expect(service.calculateTotalLaborHours).toHaveBeenCalledWith('1');
    });
  });

  describe('POST /projects/tasks', () => {
    it('should create task', async () => {
      const dto = { projectId: '1', taskName: 'New Task' };
      mockService.createTask.mockResolvedValue(task);
      expect(await controller.createTask(dto)).toEqual(task);
      expect(service.createTask).toHaveBeenCalledWith(dto);
    });
  });

  describe('PATCH /projects/tasks/:taskId', () => {
    it('should update task', async () => {
      const dto = { taskName: 'Updated Task' };
      mockService.updateTask.mockResolvedValue({ ...task, taskName: 'Updated Task' });
      expect(await controller.updateTask('1', dto)).toBeDefined();
      expect(service.updateTask).toHaveBeenCalledWith('1', dto);
    });
  });

  describe('DELETE /projects/tasks/:taskId', () => {
    it('should remove task', async () => {
      mockService.removeTask.mockResolvedValue({ removed: true });
      expect(await controller.removeTask('1')).toEqual({ removed: true });
      expect(service.removeTask).toHaveBeenCalledWith('1');
    });
  });
});
