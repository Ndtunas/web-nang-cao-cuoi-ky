import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { LoggerModule } from './common/logger/logger.module';

// 8 Mô-đun Nghiệp Vụ (theo 04_architecture.md)
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { WorkRateConfigModule } from './modules/config/work-rate-config.module';
import { TimesheetsModule } from './modules/timesheets/timesheets.module';
import { ApprovalModule } from './modules/approval/approval.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { OffboardingModule } from './modules/offboarding/offboarding.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { LeaveRequestsModule } from './modules/leave-requests/leave-requests.module';
import { PayrollModule } from './modules/payroll/payroll.module';

// Supporting Modules (Master Data)
import { DepartmentsModule } from './modules/departments/departments.module';
import { PositionsModule } from './modules/positions/positions.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ExportsModule } from './modules/exports/exports.module';

@Module({
  imports: [
    // Global Config
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule, // Logging chuẩn Pino (Global)
    DatabaseModule,

    // 8 Mô-đun Nghiệp Vụ
    AuditLogsModule, // Mô-đun 1: Nhật Ký Lưu Vết
    AuthModule, // Mô-đun 2: Xác thực
    UsersModule, // Mô-đun 2: Quản lý Users
    WorkRateConfigModule, // Mô-đun 2: Cấu hình Tham số Động
    TimesheetsModule, // Mô-đun 3: Timesheet
    ApprovalModule, // Mô-đun 4: Phê Duyệt Đa Cấp
    OnboardingModule, // Mô-đun 5: Onboarding
    OffboardingModule, // Mô-đun 6: Offboarding
    EmployeesModule, // Mô-đun 7: Thay Đổi Nhân Sự
    AttendanceModule, // Mô-đun 8: Chấm công
    LeaveRequestsModule, // Mô-đun 8: Nghỉ phép
    PayrollModule, // Mô-đun 8: Bảng lương

    // Supporting Modules
    DepartmentsModule,
    PositionsModule,
    ProjectsModule,
    NotificationsModule,
    ExportsModule, // Phase 4: Export Excel
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
