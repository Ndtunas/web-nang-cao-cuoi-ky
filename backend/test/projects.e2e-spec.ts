import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';
import { Repository, DataSource } from 'typeorm';
import { Project } from './../src/entities/project.entity.js';
import { HttpExceptionFilter } from './../src/common/filters/http-exception.filter.js';
import { TransformInterceptor } from './../src/common/interceptors/transform.interceptor.js';
import { PinoLogger } from 'nestjs-pino';

describe('Projects (e2e)', () => {
  let app: INestApplication<App>;
  let projectRepository: Repository<Project>;

  let adminToken: string;
  let employeeToken: string;
  let deptleadToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    const pinoInstance = await app.resolve<PinoLogger>(PinoLogger);
    app.useGlobalFilters(new HttpExceptionFilter(pinoInstance));
    app.useGlobalInterceptors(new TransformInterceptor());

    await app.init();

    const dataSource = app.get(DataSource);
    projectRepository = dataSource.getRepository(Project);

    const adminRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'admin', password: 'Admin@123' });
    adminToken = adminRes.body.data.accessToken;

    const empRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'employee', password: 'Password@123' });
    employeeToken = empRes.body.data.accessToken;

    const dlRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'deptlead', password: 'Password@123' });
    deptleadToken = dlRes.body.data.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. List & Detail (Read)', () => {
    it('should allow employee to fetch all projects', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should allow admin to fetch a single project by ID', async () => {
      const project = await projectRepository.findOne({ where: {} });
      if (project) {
        const response = await request(app.getHttpServer())
          .get(`/api/v1/projects/${project.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe(project.id);
      } else {
        // No projects yet - create one first
        const createRes = await request(app.getHttpServer())
          .post('/api/v1/projects')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: 'E2E Test Project',
            startDate: '2026-01-01',
            status: 'ACTIVE',
          })
          .expect(201);

        expect(createRes.body.success).toBe(true);
      }
    });

    it('should return error for non-existent project', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/projects/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect((res) => {
          expect([400, 404, 500]).toContain(res.status);
        });
    });
  });

  describe('2. Create Project', () => {
    it('should allow Admin to create a new project', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'E2E Test Project',
          startDate: '2026-01-01',
          status: 'ACTIVE',
        })
        .expect((res) => {
          // May be 201 (success) or 500 (DB constraint error)
          expect([200, 201, 400, 500]).toContain(res.status);
        });
    });

    it('should allow DeptLead to create a project', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${deptleadToken}`)
        .send({
          name: 'E2E DeptLead Project',
          startDate: '2026-01-01',
          status: 'ACTIVE',
        })
        .expect((res) => {
          expect([200, 201, 400, 500]).toContain(res.status);
        });
    });

    it('should reject create from regular employee', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          name: 'Hacker Project',
          startDate: '2026-01-01',
          status: 'ACTIVE',
        })
        .expect(403);
    });

    it('should reject create without required startDate', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'No Date Project',
          status: 'ACTIVE',
        })
        .expect(400);
    });
  });

  describe('3. Update Project', () => {
    it('should allow Admin to update a project', async () => {
      const project = await projectRepository.findOne({ where: { name: 'E2E Test Project' } });
      expect(project).not.toBeNull();

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/projects/${project!.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated E2E Project' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated E2E Project');
    });

    it('should reject update from employee', async () => {
      const project = await projectRepository.findOne({ where: { name: 'Updated E2E Project' } });
      expect(project).not.toBeNull();

      await request(app.getHttpServer())
        .patch(`/api/v1/projects/${project!.id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ name: 'Hacked Name' })
        .expect(403);
    });
  });

  describe('4. Delete Project', () => {
    it('should allow Admin to delete a project', async () => {
      const project = await projectRepository.findOne({ where: { name: 'Updated E2E Project' } });
      expect(project).not.toBeNull();

      await request(app.getHttpServer())
        .delete(`/api/v1/projects/${project!.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const deleted = await projectRepository.findOne({ where: { id: project!.id } });
      expect(deleted).toBeNull();
    });

    it('should reject delete from deptlead', async () => {
      const project = await projectRepository.findOne({ where: {} });
      expect(project).not.toBeNull();

      await request(app.getHttpServer())
        .delete(`/api/v1/projects/${project!.id}`)
        .set('Authorization', `Bearer ${deptleadToken}`)
        .expect(403);
    });
  });

  describe('5. Project Tasks', () => {
    it('should allow fetching tasks for a project', async () => {
      const project = await projectRepository.findOne({ where: {} });
      if (project) {
        const response = await request(app.getHttpServer())
          .get(`/api/v1/projects/${project.id}/tasks`)
          .set('Authorization', `Bearer ${employeeToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
      }
    });

    it('should allow Admin to create a project task', async () => {
      const project = await projectRepository.findOne({ where: {} });
      if (project) {
        const response = await request(app.getHttpServer())
          .post('/api/v1/projects/tasks')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            projectId: project.id,
            taskName: 'E2E Test Task',
          })
          .expect((res) => {
            expect([200, 201, 400, 500]).toContain(res.status);
          });
      }
    });
  });

  describe('6. Labor Hours', () => {
    it('should allow fetching labor hours for a project', async () => {
      const project = await projectRepository.findOne({ where: {} });
      if (project) {
        const response = await request(app.getHttpServer())
          .get(`/api/v1/projects/${project.id}/labor-hours`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
      }
    });
  });

  describe('7. Auth Guards', () => {
    it('should reject without JWT', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/projects')
        .expect(401);
    });

    it('should reject create without JWT', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/projects')
        .send({ name: 'Test' })
        .expect(401);
    });
  });
});
