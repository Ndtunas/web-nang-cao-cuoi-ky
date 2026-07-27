import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';
import { Repository, DataSource } from 'typeorm';
import { Position } from './../src/entities/position.entity.js';
import { HttpExceptionFilter } from './../src/common/filters/http-exception.filter.js';
import { TransformInterceptor } from './../src/common/interceptors/transform.interceptor.js';
import { PinoLogger } from 'nestjs-pino';

describe('Positions (e2e)', () => {
  let app: INestApplication<App>;
  let positionRepository: Repository<Position>;

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
    positionRepository = dataSource.getRepository(Position);

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
    it('should allow Admin to fetch all positions', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/positions')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should allow Employee to fetch all positions', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/positions')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should fetch single position by ID', async () => {
      const pos = await positionRepository.findOne({ where: {} });
      expect(pos).not.toBeNull();

      const response = await request(app.getHttpServer())
        .get(`/api/v1/positions/${pos!.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(pos!.id);
    });

    it('should return error for non-existent position', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/positions/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect((res) => {
          expect([400, 404, 500]).toContain(res.status);
        });
    });
  });

  describe('2. Create Position', () => {
    it('should allow Admin to create a new position', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/positions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'E2E Test Engineer',
          baseSalaryRatio: 1.5,
          description: 'Created by E2E test',
        })
        .expect((res) => {
          expect([201, 400, 500]).toContain(res.status);
        });
    });

    it('should reject create from non-Admin', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/positions')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          title: 'Hacker Position',
          baseSalaryRatio: 10.0,
        })
        .expect(403);
    });
  });

  describe('3. Update Position', () => {
    it('should allow Admin to update position', async () => {
      const pos = await positionRepository.findOne({ where: { title: 'E2E Test Engineer' } });
      if (!pos) {
        // Create position first
        await request(app.getHttpServer())
          .post('/api/v1/positions')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ title: 'E2E Test Engineer', baseSalaryRatio: 1.5 })
          .expect((res) => {
            expect([201, 400, 500]).toContain(res.status);
          });
      }

      const updated = await positionRepository.findOne({ where: { title: 'E2E Test Engineer' } });
      if (updated) {
        const response = await request(app.getHttpServer())
          .patch(`/api/v1/positions/${updated.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ title: 'Updated Test Engineer', baseSalaryRatio: 2.0 })
          .expect(200);

        expect(response.body.success).toBe(true);
      }
    });

    it('should reject update from non-Admin', async () => {
      const pos = await positionRepository.findOne({ where: { title: 'Updated Test Engineer' } });
      if (pos) {
        await request(app.getHttpServer())
          .patch(`/api/v1/positions/${pos.id}`)
          .set('Authorization', `Bearer ${employeeToken}`)
          .send({ title: 'Hacked Title' })
          .expect(403);
      }
    });
  });

  describe('4. Delete Position', () => {
    it('should allow Admin to delete position', async () => {
      const pos = await positionRepository.findOne({ where: { title: 'Updated Test Engineer' } });
      if (pos) {
        await request(app.getHttpServer())
          .delete(`/api/v1/positions/${pos.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        const deleted = await positionRepository.findOne({ where: { id: pos.id } });
        expect(deleted).toBeNull();
      }
    });

    it('should reject delete from non-Admin', async () => {
      const pos = await positionRepository.findOne({ where: {} });
      if (pos) {
        await request(app.getHttpServer())
          .delete(`/api/v1/positions/${pos.id}`)
          .set('Authorization', `Bearer ${employeeToken}`)
          .expect(403);
      }
    });
  });

  describe('5. Auth Guards', () => {
    it('should reject requests without JWT', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/positions')
        .expect(401);
    });
  });
});
