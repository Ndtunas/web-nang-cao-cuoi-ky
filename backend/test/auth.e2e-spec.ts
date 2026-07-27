import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';
import { Repository, DataSource } from 'typeorm';
import { User } from './../src/entities/user.entity.js';
import { Employee } from './../src/entities/employee.entity.js';
import { Department } from './../src/entities/department.entity.js';
import { ApprovalRequest } from './../src/entities/approval-request.entity.js';
import { WorkRateConfig } from './../src/entities/work-rate-config.entity.js';
import { UserRole } from './../src/common/enums/business-values.js';
import { HttpExceptionFilter } from './../src/common/filters/http-exception.filter.js';
import { TransformInterceptor } from './../src/common/interceptors/transform.interceptor.js';
import { PinoLogger } from 'nestjs-pino';

describe('Auth, Users & Config System (e2e)', () => {
  let app: INestApplication<App>;
  let userRepository: Repository<User>;
  let employeeRepository: Repository<Employee>;
  let departmentRepository: Repository<Department>;
  let approvalRequestRepository: Repository<ApprovalRequest>;
  let workRateConfigRepository: Repository<WorkRateConfig>;

  let adminToken: string;
  let employeeToken: string;
  let employeeUserId: string;
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

    const dataSource = app.get(DataSource);
    userRepository = dataSource.getRepository(User);
    employeeRepository = dataSource.getRepository(Employee);
    departmentRepository = dataSource.getRepository(Department);
    approvalRequestRepository = dataSource.getRepository(ApprovalRequest);
    workRateConfigRepository = dataSource.getRepository(WorkRateConfig);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Authentication Flows', () => {
    it('should successfully log in as Admin', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ username: 'admin', password: 'Admin@123' })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.user.role).toBe(UserRole.ADMIN);
      adminToken = response.body.data.accessToken;
    });

    it('should successfully log in as Employee', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ username: 'employee', password: 'Password@123' })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.user.role).toBe(UserRole.EMPLOYEE);
      employeeToken = response.body.data.accessToken;
      employeeUserId = response.body.data.user.id;
    });

    it('should successfully log in as Department Lead', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ username: 'deptlead', password: 'Password@123' })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.user.role).toBe(UserRole.DEPT_LEAD);
      deptleadToken = response.body.data.accessToken;
    });

    it('should reject login with wrong password', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ username: 'employee', password: 'WrongPassword@123' })
        .expect(401);

      expect(response.body.errorCode).toBe('ERR_AUTH_001');
    });

    it('should return user profile with valid JWT', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.username).toBe('admin');
    });

    it('should reject profile request without JWT', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .expect(401);
    });

    it('should support changing password directly by the employee', async () => {
      // 1. Change password
      await request(app.getHttpServer())
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ oldPassword: 'Password@123', newPassword: 'NewPassword@123' })
        .expect(201);

      // 2. Verify login with new password
      const loginNewRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ username: 'employee', password: 'NewPassword@123' })
        .expect(201);

      const newEmpToken = loginNewRes.body.data.accessToken;

      // 3. Revert password back to original to preserve DB seeder state
      await request(app.getHttpServer())
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${newEmpToken}`)
        .send({ oldPassword: 'NewPassword@123', newPassword: 'Password@123' })
        .expect(201);
    });
  });

  describe('1.1. Refresh Token & Logout Flows', () => {
    let testRefreshToken: string;

    it('should return refreshToken on login', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ username: 'employee', password: 'Password@123' })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      testRefreshToken = response.body.data.refreshToken;
    });

    it('should generate a new accessToken using a valid refreshToken', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: testRefreshToken })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.refreshToken).not.toBe(testRefreshToken);

      // Update with the newly rotated refresh token
      testRefreshToken = response.body.data.refreshToken;
    });

    it('should support logging out and clearing the stored refresh token', async () => {
      // 1. Login to get a valid access token
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ username: 'employee', password: 'Password@123' })
        .expect(201);

      const accessToken = loginResponse.body.data.accessToken;
      const refreshToken = loginResponse.body.data.refreshToken;

      // 2. Call logout
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      // 3. Trying to refresh using the cleared token should fail
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });
  });

  describe('2. Password Reset Approval Workflow', () => {
    it('should reject reset request from non-HR Department Lead', async () => {
      // Find deptlead employee record
      const leadUser = await userRepository.findOne({
        where: { username: 'deptlead' },
      });
      const leadEmp = await employeeRepository.findOne({
        where: { userId: leadUser!.id },
      });
      const originalDeptId = leadEmp!.departmentId;

      // Find non-HR Department
      const nonHrDept = await departmentRepository.findOne({
        where: { deptCode: 'BOD' },
      });

      // Temporarily change deptlead's department to BOD (non-HR)
      leadEmp!.departmentId = nonHrDept!.id;
      await employeeRepository.save(leadEmp!);

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password/request')
        .set('Authorization', `Bearer ${deptleadToken}`)
        .send({
          targetUserId: employeeUserId,
          newPassword: 'ResetPassword@123',
        })
        .expect(403);

      expect(response.body.errorCode).toBe('ERR_AUTH_002');

      // Revert deptlead department
      leadEmp!.departmentId = originalDeptId!;
      await employeeRepository.save(leadEmp!);
    });

    it('should accept reset request from HR Department Lead and create approval request', async () => {
      // Find IT Lead employee record
      const leadUser = await userRepository.findOne({
        where: { username: 'deptlead' },
      });
      const leadEmp = await employeeRepository.findOne({
        where: { userId: leadUser!.id },
      });
      const originalDeptId = leadEmp!.departmentId;

      // Find HR Department ID
      const hrDept = await departmentRepository.findOne({
        where: { deptCode: 'HR' },
      });

      // Temporarily promote IT Lead to HR Department Lead
      leadEmp!.departmentId = hrDept!.id;
      await employeeRepository.save(leadEmp!);

      // Make password reset request as HR Department Lead
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password/request')
        .set('Authorization', `Bearer ${deptleadToken}`)
        .send({
          targetUserId: employeeUserId,
          newPassword: 'ResetPassword@123',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('Admin phê duyệt');

      // Revert IT Lead department
      leadEmp!.departmentId = originalDeptId!;
      await employeeRepository.save(leadEmp!);

      // Find the generated approval request in the database
      const appRequest = await approvalRequestRepository.findOne({
        where: { transactionType: 'RESET_PASSWORD', status: 'PENDING' },
      });
      expect(appRequest).not.toBeNull();
      expect(appRequest!.referenceEntityId).toContain(employeeUserId);

      // Admin approves the request
      const approveResponse = await request(app.getHttpServer())
        .post(`/api/v1/auth/reset-password/approve/${appRequest!.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      expect(approveResponse.body.success).toBe(true);

      // Verify the employee can now log in with the reset password
      const loginResetRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ username: 'employee', password: 'ResetPassword@123' })
        .expect(201);

      const resetEmpToken = loginResetRes.body.data.accessToken;

      // Restore password back to original Password@123
      await request(app.getHttpServer())
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${resetEmpToken}`)
        .send({ oldPassword: 'ResetPassword@123', newPassword: 'Password@123' })
        .expect(201);
    });
  });

  describe('3. Users Role Management', () => {
    it('should allow Admin to update user roles', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/users/${employeeUserId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: UserRole.DIRECTOR })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.role).toBe(UserRole.DIRECTOR);

      // Revert role back to EMPLOYEE
      await request(app.getHttpServer())
        .patch(`/api/v1/users/${employeeUserId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: UserRole.EMPLOYEE })
        .expect(200);
    });

    it('should reject role update requests from normal employees', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/users/${employeeUserId}/role`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ role: UserRole.ADMIN })
        .expect(403);
    });
  });

  describe('4. Config Module (Work Rates)', () => {
    it('should allow fetching work rate configurations', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/config/work-rates')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should allow Admin or Department Lead to update work rate configurations', async () => {
      const key = 'MAX_ANNUAL_LEAVE_DAYS';

      // Update config
      const response = await request(app.getHttpServer())
        .put(`/api/v1/config/work-rates/${key}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ valueMultiplier: 15.0 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(parseFloat(response.body.data.valueMultiplier)).toBe(15.0);

      // Revert config back to 12.00
      await request(app.getHttpServer())
        .put(`/api/v1/config/work-rates/${key}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ valueMultiplier: 12.0 })
        .expect(200);
    });
  });
});
