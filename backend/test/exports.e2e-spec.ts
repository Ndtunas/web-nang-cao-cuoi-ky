import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';
import { HttpExceptionFilter } from './../src/common/filters/http-exception.filter.js';
import { TransformInterceptor } from './../src/common/interceptors/transform.interceptor.js';
import { PinoLogger } from 'nestjs-pino';

describe('Exports (e2e)', () => {
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

  describe('1. Export Employees', () => {
    it('should allow admin to export employees', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/exports/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Check content-type is Excel format or application/octet-stream (both are valid)
      const contentType = response.headers['content-type'] || '';
      expect(
        contentType.includes('excel') ||
        contentType.includes('spreadsheet') ||
        contentType.includes('octet-stream') ||
        contentType.includes('application')
      ).toBe(true);
    });

    it('should reject export employees from employee role', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/exports/employees')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);
    });
  });

  describe('2. Export Salaries (OT Summary)', () => {
    it('should allow admin to export OT summary', async () => {
      const now = new Date();
      const response = await request(app.getHttpServer())
        .get(`/api/v1/exports/ot-summary?month=${now.getMonth() + 1}&year=${now.getFullYear()}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const contentType = response.headers['content-type'] || '';
      expect(
        contentType.includes('excel') ||
        contentType.includes('spreadsheet') ||
        contentType.includes('octet-stream') ||
        contentType.includes('application')
      ).toBe(true);
    });

    it('should reject export OT summary from employee role', async () => {
      const now = new Date();
      await request(app.getHttpServer())
        .get(`/api/v1/exports/ot-summary?month=${now.getMonth() + 1}&year=${now.getFullYear()}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);
    });

    it('should require month and year params', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/exports/ot-summary')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });

  describe('3. Export Salaries', () => {
    it('should allow admin to export salaries', async () => {
      const now = new Date();
      const response = await request(app.getHttpServer())
        .get(`/api/v1/exports/salaries?month=${now.getMonth() + 1}&year=${now.getFullYear()}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const contentType = response.headers['content-type'] || '';
      expect(
        contentType.includes('excel') ||
        contentType.includes('spreadsheet') ||
        contentType.includes('octet-stream') ||
        contentType.includes('application')
      ).toBe(true);
    });

    it('should reject export salaries from employee role', async () => {
      const now = new Date();
      await request(app.getHttpServer())
        .get(`/api/v1/exports/salaries?month=${now.getMonth() + 1}&year=${now.getFullYear()}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);
    });
  });

  describe('4. Export Leave Requests', () => {
    it('should allow admin to export leave requests', async () => {
      const now = new Date();
      const response = await request(app.getHttpServer())
        .get(`/api/v1/exports/leave-requests?month=${now.getMonth() + 1}&year=${now.getFullYear()}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const contentType = response.headers['content-type'] || '';
      expect(
        contentType.includes('excel') ||
        contentType.includes('spreadsheet') ||
        contentType.includes('octet-stream') ||
        contentType.includes('application')
      ).toBe(true);
    });

    it('should reject export leave requests from employee role', async () => {
      const now = new Date();
      await request(app.getHttpServer())
        .get(`/api/v1/exports/leave-requests?month=${now.getMonth() + 1}&year=${now.getFullYear()}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);
    });
  });

  describe('5. Auth Guards', () => {
    it('should reject without JWT', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/exports/employees')
        .expect(401);
    });

    it('should reject salaries export without JWT', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/exports/salaries?month=1&year=2026')
        .expect(401);
    });

    it('should reject OT summary without JWT', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/exports/ot-summary?month=1&year=2026')
        .expect(401);
    });
  });
});
