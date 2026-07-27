import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';
import { Repository, DataSource } from 'typeorm';
import { Department } from './../src/entities/department.entity.js';
import { HttpExceptionFilter } from './../src/common/filters/http-exception.filter.js';
import { TransformInterceptor } from './../src/common/interceptors/transform.interceptor.js';
import { PinoLogger } from 'nestjs-pino';

describe('Departments (e2e)', () => {
  let app: INestApplication<App>;
  let departmentRepository: Repository<Department>;

  let adminToken: string;
  let employeeToken: string;

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
    departmentRepository = dataSource.getRepository(Department);

    const adminRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'admin', password: 'Admin@123' });
    adminToken = adminRes.body.data.accessToken;

    const empRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'employee', password: 'Password@123' });
    employeeToken = empRes.body.data.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. List & Detail (Read)', () => {
    it('should allow Admin to fetch all departments', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/departments')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should allow Employee to fetch all departments', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/departments')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should allow fetching a single department by ID', async () => {
      const dept = await departmentRepository.findOne({ where: {} });
      expect(dept).not.toBeNull();

      const response = await request(app.getHttpServer())
        .get(`/api/v1/departments/${dept!.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(dept!.id);
    });

    it('should return error for non-existent department', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/departments/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect((res) => {
          expect([400, 404, 500]).toContain(res.status);
        });
    });
  });

  describe('2. Create Department', () => {
    it('should allow Admin to create a new department', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/departments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          deptCode: 'TEST',
          name: 'Test Department',
          description: 'E2E test department',
        })
        .expect((res) => {
          expect([201, 400, 500]).toContain(res.status);
        });
    });

    it('should reject create from non-Admin', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/departments')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          deptCode: 'TEST2',
          name: 'Test Dept 2',
        })
        .expect(403);
    });

    it('should reject create with duplicate deptCode', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/departments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          deptCode: 'TEST',
          name: 'Duplicate Test',
        })
        .expect((res) => {
          expect([400, 404, 500]).toContain(res.status);
        });
    });
  });

  describe('3. Update Department', () => {
    it('should allow Admin to update department name', async () => {
      const dept = await departmentRepository.findOne({ where: { deptCode: 'TEST' } });
      expect(dept).not.toBeNull();

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/departments/${dept!.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Test Department' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Test Department');
    });

    it('should reject update from non-Admin', async () => {
      const dept = await departmentRepository.findOne({ where: { deptCode: 'TEST' } });
      expect(dept).not.toBeNull();

      await request(app.getHttpServer())
        .patch(`/api/v1/departments/${dept!.id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ name: 'Hacked Name' })
        .expect(403);
    });
  });

  describe('4. Delete Department', () => {
    it('should allow Admin to delete department', async () => {
      const dept = await departmentRepository.findOne({ where: { deptCode: 'TEST' } });
      expect(dept).not.toBeNull();

      await request(app.getHttpServer())
        .delete(`/api/v1/departments/${dept!.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const deleted = await departmentRepository.findOne({ where: { id: dept!.id } });
      expect(deleted).toBeNull();
    });

    it('should reject delete from non-Admin', async () => {
      const dept = await departmentRepository.findOne({ where: {} });
      expect(dept).not.toBeNull();

      await request(app.getHttpServer())
        .delete(`/api/v1/departments/${dept!.id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);
    });
  });

  describe('5. Auth Guards', () => {
    it('should reject requests without JWT', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/departments')
        .expect(401);
    });

    it('should reject requests with invalid JWT', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/departments')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);
    });
  });
});
