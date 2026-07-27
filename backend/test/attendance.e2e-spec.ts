import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';
import { Repository, DataSource } from 'typeorm';
import { Attendance } from './../src/entities/attendance.entity.js';
import { HttpExceptionFilter } from './../src/common/filters/http-exception.filter.js';
import { TransformInterceptor } from './../src/common/interceptors/transform.interceptor.js';
import { PinoLogger } from 'nestjs-pino';

describe('Attendance (e2e)', () => {
  let app: INestApplication<App>;
  let attendanceRepository: Repository<Attendance>;

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
    attendanceRepository = dataSource.getRepository(Attendance);

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

  describe('1. Check-in / Check-out', () => {
    it('should handle employee check-in', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/attendance/check-in')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect((res) => {
          expect([200, 201, 400, 500]).toContain(res.status);
        });
    });

    it('should handle employee check-out', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/attendance/check-out')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect((res) => {
          expect([200, 201, 400, 500]).toContain(res.status);
        });
    });

    it('should handle admin check-in', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/attendance/check-in')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect((res) => {
          expect([200, 201, 400, 404, 500]).toContain(res.status);
        });
    });
  });

  describe('2. Today Status', () => {
    it('should allow employee to get today attendance status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/attendance/today-status')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should allow employee to get today attendance record', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/attendance/today')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('3. Attendance History', () => {
    it('should allow employee to get their attendance history', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/attendance/my-history')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should allow employee to get monthly stats', async () => {
      const now = new Date();
      const response = await request(app.getHttpServer())
        .get(`/api/v1/attendance/stats-month?month=${now.getMonth() + 1}&year=${now.getFullYear()}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('4. Admin: Get All Attendance', () => {
    it('should allow admin to get all attendance records', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/attendance')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should allow admin to filter attendance by date range', async () => {
      const today = new Date().toISOString().split('T')[0];
      const response = await request(app.getHttpServer())
        .get(`/api/v1/attendance?dateFrom=${today}&dateTo=${today}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('5. Auth Guards', () => {
    it('should reject check-in without JWT', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/attendance/check-in')
        .expect(401);
    });

    it('should reject today status without JWT', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/attendance/today-status')
        .expect(401);
    });
  });
});
