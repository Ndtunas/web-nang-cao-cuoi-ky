import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DatabaseModule } from './database/database.module.js';

// 8 Mô-đun Nghiệp Vụ (theo 04_architecture.md)
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { WorkRateConfigModule } from './modules/config/work-rate-config.module.js';
import { TimesheetsModule } from './modules/timesheets/timesheets.module.js';
import { ApprovalModule } from './modules/approval/approval.module.js';
import { OnboardingModule } from './modules/onboarding/onboarding.module.js';
import { OffboardingModule } from './modules/offboarding/offboarding.module.js';
import { EmployeesModule } from './modules/employees/employees.module.js';
import { AttendanceModule } from './modules/attendance/attendance.module.js';
import { LeaveRequestsModule } from './modules/leave-requests/leave-requests.module.js';
import { PayrollModule } from './modules/payroll/payroll.module.js';

// Supporting Modules (Master Data)
import { DepartmentsModule } from './modules/departments/departments.module.js';
import { PositionsModule } from './modules/positions/positions.module.js';
import { ProjectsModule } from './modules/projects/projects.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';

@Module({
  imports: [
    // Global Config
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,

    // 8 Mô-đun Nghiệp Vụ
    AuditLogsModule,        // Mô-đun 1: Nhật Ký Lưu Vết
    AuthModule,             // Mô-đun 2: Xác thực
    UsersModule,            // Mô-đun 2: Quản lý Users
    WorkRateConfigModule,   // Mô-đun 2: Cấu hình Tham số Động
    TimesheetsModule,       // Mô-đun 3: Timesheet
    ApprovalModule,         // Mô-đun 4: Phê Duyệt Đa Cấp
    OnboardingModule,       // Mô-đun 5: Onboarding
    OffboardingModule,      // Mô-đun 6: Offboarding
    EmployeesModule,        // Mô-đun 7: Thay Đổi Nhân Sự
    AttendanceModule,       // Mô-đun 8: Chấm công
    LeaveRequestsModule,    // Mô-đun 8: Nghỉ phép
    PayrollModule,          // Mô-đun 8: Bảng lương

    // Supporting Modules
    DepartmentsModule,
    PositionsModule,
    ProjectsModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
