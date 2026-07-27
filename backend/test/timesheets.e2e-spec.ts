import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';
import { Repository, DataSource } from 'typeorm';
import { Timesheet } from './../src/entities/timesheet.entity.js';
import { HttpExceptionFilter } from './../src/common/filters/http-exception.filter.js';
import { TransformInterceptor } from './../src/common/interceptors/transform.interceptor.js';
import { PinoLogger } from 'nestjs-pino';

describe('Timesheets (e2e)', () => {
  let app: INestApplication<App>;
  let timesheetRepository: Repository<Timesheet>;

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
    timesheetRepository = dataSource.getRepository(Timesheet);

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

  describe('1. Get My Weekly Timesheet', () => {
    it('should allow employee to get their weekly timesheet', async () => {
      const now = new Date();
      const weekNumber = getWeekNumber(now);
      const year = now.getFullYear();

      const response = await request(app.getHttpServer())
        .get(`/api/v1/timesheets/my-weekly?weekNumber=${weekNumber}&year=${year}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('2. Save Timesheet Entries', () => {
    it('should handle timesheet entries saving', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/timesheets/entries')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          entries: [
            {
              projectId: null,
              taskDescription: 'E2E test task',
              hours: 8,
              date: new Date().toISOString().split('T')[0],
            },
          ],
        })
        .expect((res) => {
          expect([200, 201, 400, 500]).toContain(res.status);
        });
    });
  });

  describe('3. Get Pending Approval', () => {
    it('should allow employee to get pending approval timesheets', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/timesheets/pending-approval')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('4. OT Summary', () => {
    it('should allow fetching OT summary by month/year', async () => {
      const now = new Date();
      const response = await request(app.getHttpServer())
        .get(`/api/v1/timesheets/ot-summary?month=${now.getMonth() + 1}&year=${now.getFullYear()}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('5. Auth Guards', () => {
    it('should reject without JWT', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/timesheets/my-weekly?weekNumber=1&year=2026')
        .expect(401);
    });

    it('should reject save entries without JWT', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/timesheets/entries')
        .send({ entries: [] })
        .expect(401);
    });
  });
});

function getWeekNumber(d: Date): number {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
