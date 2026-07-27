import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';
import { Repository, DataSource } from 'typeorm';
import { User } from './../src/entities/user.entity.js';
import { HttpExceptionFilter } from './../src/common/filters/http-exception.filter.js';
import { TransformInterceptor } from './../src/common/interceptors/transform.interceptor.js';
import { PinoLogger } from 'nestjs-pino';
import { UserRole } from './../src/common/enums/business-values.js';

describe('Users (e2e)', () => {
  let app: INestApplication<App>;
  let userRepository: Repository<User>;

  let adminToken: string;
  let employeeToken: string;
  let employeeUserId: string;

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
    userRepository = dataSource.getRepository(User);

    const adminRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'admin', password: 'Admin@123' });
    adminToken = adminRes.body.data.accessToken;

    const empRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'employee', password: 'Password@123' });
    employeeToken = empRes.body.data.accessToken;
    employeeUserId = empRes.body.data.user.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Role Management', () => {
    it('should allow Admin to update user roles', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/users/${employeeUserId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: UserRole.DIRECTOR })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.role).toBe(UserRole.DIRECTOR);

      // Revert
      await request(app.getHttpServer())
        .patch(`/api/v1/users/${employeeUserId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: UserRole.EMPLOYEE })
        .expect(200);
    });

    it('should reject role update from normal employees', async () => {
      const targetUser = await userRepository.findOne({ where: { username: 'deptlead' } });
      expect(targetUser).not.toBeNull();

      await request(app.getHttpServer())
        .patch(`/api/v1/users/${targetUser!.id}/role`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ role: UserRole.ADMIN })
        .expect(403);
    });

    it('should return error for non-existent user', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/users/00000000-0000-0000-0000-000000000000/role')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: UserRole.EMPLOYEE })
        .expect((res) => {
          expect([400, 404, 500]).toContain(res.status);
        });
    });
  });

  describe('2. Auth Guards', () => {
    it('should reject requests without JWT', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/users/${employeeUserId}/role`)
        .send({ role: UserRole.ADMIN })
        .expect(401);
    });
  });
});
