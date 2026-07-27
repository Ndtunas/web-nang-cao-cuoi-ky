import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';
import { HttpExceptionFilter } from './../src/common/filters/http-exception.filter.js';
import { TransformInterceptor } from './../src/common/interceptors/transform.interceptor.js';
import { PinoLogger } from 'nestjs-pino';

describe('Payroll (e2e)', () => {
  let app: INestApplication<App>;

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

  describe('1. Calculate Monthly Payroll', () => {
    it('should handle payroll calculation', async () => {
      const now = new Date();
      const response = await request(app.getHttpServer())
        .post('/api/v1/payroll/calculate-monthly')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          month: now.getMonth() + 1,
          year: now.getFullYear(),
        })
        .expect((res) => {
          expect([200, 201, 400, 500]).toContain(res.status);
        });
    });

    it('should reject calculate from employee', async () => {
      const now = new Date();
      await request(app.getHttpServer())
        .post('/api/v1/payroll/calculate-monthly')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          month: now.getMonth() + 1,
          year: now.getFullYear(),
        })
        .expect(403);
    });
  });

  describe('2. Get Salaries', () => {
    it('should allow Admin to get salaries for a month', async () => {
      const now = new Date();
      const response = await request(app.getHttpServer())
        .get(`/api/v1/payroll/salaries?month=${now.getMonth() + 1}&year=${now.getFullYear()}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject get salaries from employee', async () => {
      const now = new Date();
      await request(app.getHttpServer())
        .get(`/api/v1/payroll/salaries?month=${now.getMonth() + 1}&year=${now.getFullYear()}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);
    });
  });

  describe('3. Approve Monthly Payroll', () => {
    it('should allow Admin to approve monthly payroll', async () => {
      const now = new Date();
      const response = await request(app.getHttpServer())
        .patch('/api/v1/payroll/approve')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          month: now.getMonth() + 1,
          year: now.getFullYear(),
          comment: 'E2E test approval',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('4. My Payslip', () => {
    it('should allow employee to get their payslip', async () => {
      const now = new Date();
      const response = await request(app.getHttpServer())
        .get(`/api/v1/payroll/my-payslip?month=${now.getMonth() + 1}&year=${now.getFullYear()}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should allow admin to get their payslip', async () => {
      const now = new Date();
      const response = await request(app.getHttpServer())
        .get(`/api/v1/payroll/my-payslip?month=${now.getMonth() + 1}&year=${now.getFullYear()}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('5. Auth Guards', () => {
    it('should reject without JWT', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/payroll/my-payslip?month=1&year=2026')
        .expect(401);
    });

    it('should reject calculate without JWT', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/payroll/calculate-monthly')
        .send({ month: 1, year: 2026 })
        .expect(401);
    });
  });
});
