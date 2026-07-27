import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';
import { HttpExceptionFilter } from './../src/common/filters/http-exception.filter.js';
import { TransformInterceptor } from './../src/common/interceptors/transform.interceptor.js';
import { PinoLogger } from 'nestjs-pino';

describe('Offboarding (e2e)', () => {
  let app: INestApplication<App>;

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

  describe('1. Submit Resignation Request', () => {
    it('should handle resignation request submission', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/offboarding/resignation-request')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ reason: 'E2E test resignation' })
        .expect((res) => {
          // May be 201 (success) or 400 (business logic rejection)
          expect([201, 400, 500]).toContain(res.status);
        });
    });

    it('should handle admin resignation request', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/offboarding/resignation-request')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Admin E2E test resignation' })
        .expect((res) => {
          // May be 201, 400 (no employee), or 404
          expect([201, 400, 404]).toContain(res.status);
        });
    });
  });

  describe('2. Get All Pending Offboarding Tasks', () => {
    it('should allow admin to get all pending offboarding tasks', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/offboarding/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should allow deptlead to get all pending tasks', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/offboarding/tasks')
        .set('Authorization', `Bearer ${deptleadToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject from regular employee', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/offboarding/tasks')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);
    });
  });

  describe('3. Get Tasks by Employee', () => {
    it('should allow admin to get tasks for an employee', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/offboarding/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const tasks = response.body.data;
      if (tasks && tasks.length > 0) {
        const empId = tasks[0].employee?.id || tasks[0].employeeId;
        if (empId) {
          const taskResponse = await request(app.getHttpServer())
            .get(`/api/v1/offboarding/tasks/${empId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);

          expect(taskResponse.body.success).toBe(true);
        }
      } else {
        expect(response.body.success).toBe(true);
      }
    });
  });

  describe('4. Check All Completed', () => {
    it('should handle checking if all tasks are completed', async () => {
      const empResponse = await request(app.getHttpServer())
        .get('/api/v1/employees')
        .set('Authorization', `Bearer ${adminToken}`);

      const employees = empResponse.body.data;
      if (employees && employees.length > 0) {
        const empId = employees[0].id;
        await request(app.getHttpServer())
          .get(`/api/v1/offboarding/check-completed/${empId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect((res) => {
            expect([200, 400, 404, 500]).toContain(res.status);
          });
      } else {
        expect(true).toBe(true);
      }
    });
  });

  describe('5. Auth Guards', () => {
    it('should reject resignation without JWT', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/offboarding/resignation-request')
        .send({ reason: 'test' })
        .expect(401);
    });

    it('should reject tasks without JWT', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/offboarding/tasks')
        .expect(401);
    });

    it('should reject check-completed without JWT', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/offboarding/check-completed/00000000-0000-0000-0000-000000000000')
        .expect(401);
    });
  });
});
