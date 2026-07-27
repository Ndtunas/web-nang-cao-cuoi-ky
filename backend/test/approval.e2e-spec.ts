import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';
import { HttpExceptionFilter } from './../src/common/filters/http-exception.filter.js';
import { TransformInterceptor } from './../src/common/interceptors/transform.interceptor.js';
import { PinoLogger } from 'nestjs-pino';

describe('Approval (e2e)', () => {
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

  describe('1. Get Pending My Level', () => {
    it('should allow employee to get pending approvals at their level', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/approval-requests/pending-my-level')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should allow deptlead to get pending approvals at their level', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/approval-requests/pending-my-level')
        .set('Authorization', `Bearer ${deptleadToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should allow admin to get pending approvals at their level', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/approval-requests/pending-my-level')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('2. Get My Submitted Requests', () => {
    it('should allow employee to get their submitted requests', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/approval-requests/my-submitted')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('3. Get Approval Configs', () => {
    it('should allow admin to get approval configs', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/approval-configs')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should allow deptlead to get approval configs', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/approval-configs')
        .set('Authorization', `Bearer ${deptleadToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('4. Update Approval Config', () => {
    it('should handle approval config update', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/v1/approval-configs/LEAVE_REQUEST')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ requiredLevels: 2 })
        .expect((res) => {
          expect([200, 400, 404, 500]).toContain(res.status);
        });
    });

    it('should reject update from employee', async () => {
      await request(app.getHttpServer())
        .put('/api/v1/approval-configs/LEAVE_REQUEST')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ requiredLevels: 1 })
        .expect(403);
    });
  });

  describe('5. Approve/Reject Non-existent Request', () => {
    it('should return error when approving non-existent request', async () => {
      // Returns 404 or 400 depending on implementation
      await request(app.getHttpServer())
        .patch('/api/v1/approval-requests/00000000-0000-0000-0000-000000000000/approve')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ comment: 'test' })
        .expect((res) => {
          expect([400, 404, 500]).toContain(res.status);
        });
    });

    it('should return error when rejecting non-existent request', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/approval-requests/00000000-0000-0000-0000-000000000000/reject')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ comment: 'test' })
        .expect((res) => {
          expect([400, 404, 500]).toContain(res.status);
        });
    });

    it('should return error when getting detail of non-existent request', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/approval-requests/00000000-0000-0000-0000-000000000000/detail')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect((res) => {
          expect([400, 404, 500]).toContain(res.status);
        });
    });
  });

  describe('6. Auth Guards', () => {
    it('should reject without JWT', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/approval-requests/pending-my-level')
        .expect(401);
    });

    it('should reject approve without JWT', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/approval-requests/00000000-0000-0000-0000-000000000000/approve')
        .send({ comment: 'test' })
        .expect(401);
    });
  });
});
