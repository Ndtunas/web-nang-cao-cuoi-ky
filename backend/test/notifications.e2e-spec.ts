import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';
import { HttpExceptionFilter } from './../src/common/filters/http-exception.filter.js';
import { TransformInterceptor } from './../src/common/interceptors/transform.interceptor.js';
import { PinoLogger } from 'nestjs-pino';

describe('Notifications (e2e)', () => {
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

  describe('1. Get My Notifications', () => {
    it('should allow employee to get their notifications', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should allow admin to get their notifications', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('2. Get Unread Count', () => {
    it('should allow employee to get unread notification count', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/notifications/unread-count')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('count');
    });

    it('should allow admin to get unread notification count', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/notifications/unread-count')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('3. Mark All Read', () => {
    it('should allow employee to mark all notifications as read', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/v1/notifications/mark-all-read')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should allow admin to mark all notifications as read', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/v1/notifications/mark-all-read')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('4. Mark Single Notification Read', () => {
    it('should return error for non-existent notification', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/notifications/00000000-0000-0000-0000-000000000000/read')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect((res) => {
          expect([400, 404, 500]).toContain(res.status);
        });
    });
  });

  describe('5. Auth Guards', () => {
    it('should reject without JWT', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .expect(401);
    });

    it('should reject unread-count without JWT', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/notifications/unread-count')
        .expect(401);
    });

    it('should reject mark-all-read without JWT', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/notifications/mark-all-read')
        .expect(401);
    });
  });
});
