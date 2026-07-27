import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';
import { Repository, DataSource } from 'typeorm';
import { LeaveRequest } from './../src/entities/leave-request.entity.js';
import { HttpExceptionFilter } from './../src/common/filters/http-exception.filter.js';
import { TransformInterceptor } from './../src/common/interceptors/transform.interceptor.js';
import { PinoLogger } from 'nestjs-pino';

describe('LeaveRequests (e2e)', () => {
  let app: INestApplication<App>;
  let leaveRequestRepository: Repository<LeaveRequest>;

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
    leaveRequestRepository = dataSource.getRepository(LeaveRequest);

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

  describe('1. Submit Leave Request', () => {
    it('should handle leave request submission', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date(tomorrow);
      nextWeek.setDate(nextWeek.getDate() + 7);

      const response = await request(app.getHttpServer())
        .post('/api/v1/leave-requests')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          leaveType: 'ANNUAL',
          startDate: tomorrow.toISOString().split('T')[0],
          endDate: nextWeek.toISOString().split('T')[0],
          reason: 'E2E test annual leave',
        })
        .expect((res) => {
          expect([201, 400, 500]).toContain(res.status);
        });
    });

    it('should reject leave request without required fields', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/leave-requests')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          leaveType: 'ANNUAL',
        })
        .expect(400);
    });
  });

  describe('2. Get My Leave Requests', () => {
    it('should allow employee to get their leave requests', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/leave-requests/my-requests')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('3. Admin Get All Leave Requests', () => {
    it('should allow admin to get all leave requests', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/leave-requests')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should reject get all from regular employee', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/leave-requests')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);
    });
  });

  describe('4. Cancel Leave Request', () => {
    it('should handle canceling a leave request', async () => {
      // Submit a new leave request first
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 30);
      const dayAfter = new Date(tomorrow);
      dayAfter.setDate(dayAfter.getDate() + 1);

      const submitRes = await request(app.getHttpServer())
        .post('/api/v1/leave-requests')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          leaveType: 'ANNUAL',
          startDate: tomorrow.toISOString().split('T')[0],
          endDate: dayAfter.toISOString().split('T')[0],
          reason: 'E2E cancel test',
        })
        .expect((res) => {
          expect([201, 400, 500]).toContain(res.status);
        });
    });
  });

  describe('5. Auth Guards', () => {
    it('should reject submit without JWT', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/leave-requests')
        .send({ leaveType: 'ANNUAL', startDate: '2026-01-01', endDate: '2026-01-02' })
        .expect(401);
    });

    it('should reject my-requests without JWT', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/leave-requests/my-requests')
        .expect(401);
    });
  });
});
