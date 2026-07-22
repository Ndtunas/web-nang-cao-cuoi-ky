# Xây Dựng Khung Backend Cơ Bản (NestJS + TypeORM + PostgreSQL)

Xây dựng khung backend hoàn chỉnh cho hệ thống HRM, bao gồm: kết nối CSDL, định nghĩa 21 Entity, các module shared (DTO, Filter, Validation), 8 mô-đun nghiệp vụ theo `04_architecture.md`, và các supporting modules cho master data.

## Hiện trạng

- NestJS v11 đã được khởi tạo với `ValidationPipe`, `class-validator`, `class-transformer`, `@nestjs/config`
- Có sẵn file enums tại `src/common/enums/business-values.ts` (đầy đủ UserRole, EmployeeStatus, Gender, etc.)
- Schema SQL PostgreSQL hoàn chỉnh 21 bảng tại `database/03_schema.sql` (Snowflake ID, triggers, indexes)
- Chưa cài TypeORM / PostgreSQL driver, chưa có entity/module nào

## Tài liệu tham chiếu

| Tài liệu | Nội dung chính | Ảnh hưởng tới plan |
|-----------|---------------|---------------------|
| `business/01_user_stories.md` | 26 User Stories, 8 mô-đun | Xác định scope endpoints |
| `business/02_domain_model.md` | 21 Entities, phương thức, quan hệ | Xác định entities & relations |
| `business/03_workflows.md` | 10 sơ đồ luồng, Approval Matrix, công thức lương | Audit interceptor architecture, approval flow |
| `business/04_architecture.md` | Layered Architecture, 100% RESTful API specs | **Cấu trúc module & endpoints** |
| `business/05_business_values.md` | Enums, Validation Rules, Error Codes i18n | **Format lỗi chuẩn, DTO validation** |
| `database/01_id_code_generation_rules.md` | Snowflake ID, Smart Code patterns | ID strategy cho entities |
| `database/02_tables_and_relationships.md` | 21 bảng chi tiết | Entity columns & FK |
| `database/03_schema.sql` | DDL Script PostgreSQL | **Source of truth cho entities** |

---

## Proposed Changes

### Phase 1: Cài đặt Dependencies & Cấu hình CSDL

#### [MODIFY] [package.json](file:///mnt/workspace/999_personal/000-zon-web-nang-cao-cuoi-ky/backend/package.json)
Cài thêm các packages:
- `@nestjs/typeorm`, `typeorm`, `pg` — ORM & PostgreSQL driver
- `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt` — JWT Auth (theo kiến trúc `04_architecture.md`: JWT Bearer)
- `bcrypt`, `@types/bcrypt` — Password hashing (theo `05_business_values.md` mục 3: password validation)

#### [NEW] `.env`
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=hrm_system
JWT_SECRET=hrm-secret-key-2026
JWT_EXPIRES_IN=24h
PORT=8080
```

---

### Phase 2: Shared Module — Common Utilities

#### [NEW] `src/common/dto/pagination-query.dto.ts`
- DTO chuẩn cho pagination: `page`, `limit`, `search`, `sortBy`, `sortOrder`
- Theo yêu cầu `04_architecture.md`: các endpoint GET danh sách hỗ trợ pagination, search, filter

#### [NEW] `src/common/dto/paginated-response.dto.ts`
- Response wrapper: `data[]`, `meta { total, page, limit, totalPages }`

#### [NEW] `src/common/filters/http-exception.filter.ts`
- Global Exception Filter chuẩn **theo `05_business_values.md` mục 4**
- Trả response format **đúng chuẩn i18n**:
```json
{
  "statusCode": 400,
  "errorCode": "ERR_LEAVE_001",
  "i18nKey": "error.leave.insufficientBalance",
  "params": { "requestedDays": 5, "remainingDays": 2 },
  "timestamp": "2026-07-21T16:38:00.000Z"
}
```

#### [NEW] `src/common/exceptions/business.exception.ts`
- Custom exception class implement `BusinessErrorPayload` (đã có trong `business-values.ts`)
- Chứa sẵn mapping **10 error codes** từ `05_business_values.md` mục 4:
  - `ERR_AUTH_001` (401) → `error.auth.invalidCredentials`
  - `ERR_AUTH_002` (403) → `error.auth.accessDenied`
  - `ERR_EMP_001` (400) → `error.employee.codeOrEmailExists`
  - `ERR_EMP_002` (400) → `error.employee.cannotTransferNoticePeriod`
  - `ERR_LEAVE_001` (400) → `error.leave.insufficientBalance`
  - `ERR_LEAVE_002` (400) → `error.leave.invalidDateRange`
  - `ERR_APPROVAL_001` (403) → `error.approval.unauthorizedLevel`
  - `ERR_APPROVAL_002` (400) → `error.approval.alreadyRejected`
  - `ERR_TIMESHEET_001` (400) → `error.timesheet.alreadyApproved`
  - `ERR_PAYROLL_001` (400) → `error.payroll.alreadyFinalized`

#### [NEW] `src/common/interceptors/transform.interceptor.ts`
- Response wrapper interceptor: `{ success: true, data, meta }`

#### [NEW] `src/common/validators/validation-rules.ts`
- Chứa **6 validation rules** từ `05_business_values.md` mục 3, dùng cho các DTOs:
  1. `empCode`: Format `^NV[0-9]{5}$` (VD: `NV00001`)
  2. `email`: Standard Email Regex (`^[a-zA-Z0-9._%+-]+@company\.com$`)
  3. `password`: Min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special char
  4. `phone`: Format `^(0[3|5|7|8|9])[0-9]{8}$` (10 chữ số)
  5. `hoursSpent`: Min `0.5`, Max `24.0`
  6. `taxCode`: Format `^[0-9]{10,13}$` (10 hoặc 13 chữ số)

---

### Phase 3: Định nghĩa 21 Entities (TypeORM)

Tạo tất cả entities khớp 1:1 với `database/03_schema.sql`:

| # | Entity File | Table | Key Relations |
|---|-------------|-------|---------------|
| 1 | `src/entities/user.entity.ts` | `users` | 1-1 Employee |
| 2 | `src/entities/employee.entity.ts` | `employees` | FK → User, Department, Position |
| 3 | `src/entities/department.entity.ts` | `departments` | FK → Employee (manager) |
| 4 | `src/entities/position.entity.ts` | `positions` | 1-N Employee |
| 5 | `src/entities/project.entity.ts` | `projects` | FK → Employee (PM) |
| 6 | `src/entities/project-task.entity.ts` | `project_tasks` | FK → Project |
| 7 | `src/entities/timesheet.entity.ts` | `timesheets` | FK → Employee, ApprovalRequest |
| 8 | `src/entities/timesheet-entry.entity.ts` | `timesheet_entries` | FK → Timesheet, Project, ProjectTask |
| 9 | `src/entities/approval-config.entity.ts` | `approval_configs` | — |
| 10 | `src/entities/approval-request.entity.ts` | `approval_requests` | FK → Employee |
| 11 | `src/entities/approval-step-history.entity.ts` | `approval_step_histories` | FK → ApprovalRequest, Employee |
| 12 | `src/entities/onboarding-task.entity.ts` | `onboarding_tasks` | FK → Employee ×3 |
| 13 | `src/entities/offboarding-task.entity.ts` | `offboarding_tasks` | FK → Employee ×3 |
| 14 | `src/entities/notification.entity.ts` | `notifications` | FK → User |
| 15 | `src/entities/job-history.entity.ts` | `job_histories` | FK → Employee, Dept ×2, Position ×2 |
| 16 | `src/entities/salary-history.entity.ts` | `salary_histories` | FK → Employee, ApprovalRequest |
| 17 | `src/entities/attendance.entity.ts` | `attendances` | FK → Employee |
| 18 | `src/entities/leave-request.entity.ts` | `leave_requests` | FK → Employee, ApprovalRequest |
| 19 | `src/entities/salary.entity.ts` | `salaries` | FK → Employee, ApprovalRequest |
| 20 | `src/entities/system-audit-log.entity.ts` | `system_audit_logs` | FK → User |
| 21 | `src/entities/work-rate-config.entity.ts` | `work_rate_configs` | FK → User |

> [!IMPORTANT]
> Các entity sẽ sử dụng `@PrimaryColumn('bigint')` thay vì `@PrimaryGeneratedColumn()` vì ID được sinh bởi PostgreSQL function `fn_generate_snowflake_id()` (DEFAULT value trong DDL). TypeORM sẽ để DB tự sinh. Tham chiếu: `database/01_id_code_generation_rules.md`.

#### [NEW] `src/entities/index.ts`
- Barrel export tất cả 21 entities

---

### Phase 4: Database Module & TypeORM Configuration

#### [NEW] `src/database/database.module.ts`
- `TypeOrmModule.forRootAsync()` sử dụng `ConfigService` để đọc `.env`
- Đăng ký tất cả 21 entities
- `synchronize: false` (dùng schema SQL có sẵn, không auto-sync — theo `database/README.md` nguyên tắc Database-Driven)

#### [MODIFY] `src/app.module.ts`
- Import `ConfigModule.forRoot()`, `DatabaseModule`
- Import tất cả feature modules

---

### Phase 5: 8 Mô-đun Nghiệp Vụ (theo `04_architecture.md`)

Xây dựng đúng **8 mô-đun** theo quy hoạch API Specs từ `04_architecture.md` mục 2, mỗi module theo pattern: `Module → Controller → Service → DTOs`

> [!IMPORTANT]
> Vì đây là "khung cơ bản", Phase 5 sẽ tạo **đầy đủ cấu trúc file** cho cả 8 module nhưng chỉ implement logic CRUD cơ bản. Business logic phức tạp (approval engine, OT calculation, final settlement...) sẽ được bổ sung ở giai đoạn sau.

#### 5.1 Mô-đun 1: Nhật Ký Lưu Vết Giao Dịch (Audit Trail — US-01→03)
```
src/modules/audit-logs/
├── audit-logs.module.ts
├── audit-logs.controller.ts
├── audit-logs.service.ts
├── audit-log.interceptor.ts       ← Interceptor thuộc module này (theo 03_workflows.md mục 1)
└── dto/
    └── query-audit-log.dto.ts
```
- `GET /api/v1/audit-logs` — Tra cứu nhật ký (filter: `fromDate`, `toDate`, `actorId`, `actionType`, `entityName`)
- `GET /api/v1/audit-logs/:id/diff` — Xem chi tiết so sánh `oldData` vs `newData`
- **`audit-log.interceptor.ts`** — HTTP Interceptor tự động chặn request (theo `03_workflows.md` mục 1): lấy `actorId`, `role`, `IP`, `UserAgent` → đọc `oldData` trước khi ghi → thực thi thao tác → đọc `newData` → tạo bản ghi `SystemAuditLog` bất biến

#### 5.2 Mô-đun 2: Xác thực & Cấu hình Tham số Động (Auth & Config — US-04→06)
```
src/modules/auth/
├── auth.module.ts
├── auth.controller.ts
├── auth.service.ts
├── strategies/
│   └── jwt.strategy.ts
├── guards/
│   ├── jwt-auth.guard.ts
│   └── roles.guard.ts
├── decorators/
│   ├── current-user.decorator.ts
│   └── roles.decorator.ts
└── dto/
    ├── login.dto.ts
    └── change-password.dto.ts     ← Validate theo 05_business_values.md: min 8, 1 upper, 1 lower, 1 digit, 1 special
    └── reset-password-request.dto.ts ← DTO cho HR Lead gửi yêu cầu reset password

src/modules/users/
├── users.module.ts
├── users.controller.ts
├── users.service.ts
└── dto/
    └── update-role.dto.ts         ← Validate role ∈ UserRole enum

src/modules/config/
├── config.module.ts
├── config.controller.ts          ← Route prefix: 'config/work-rates'
├── config.service.ts
└── dto/
    └── update-work-rate.dto.ts
```
- `POST /api/v1/auth/login` — Đăng nhập, nhận JWT (sử dụng quy tắc băm: empCode + pass + dob)
- `GET /api/v1/auth/profile` — Thông tin user đang đăng nhập
- `POST /api/v1/auth/change-password` — Đổi mật khẩu
- `POST /api/v1/auth/reset-password/request` — Yêu cầu reset mật khẩu (HR Lead gửi, tạo approval request)
- `POST /api/v1/auth/reset-password/approve/:requestId` — Phê duyệt reset mật khẩu (Admin thực hiện)
- `PATCH /api/v1/users/:id/role` — Phân quyền (Admin)
- `GET /api/v1/config/work-rates` — Lấy danh sách hệ số giờ công
- `PUT /api/v1/config/work-rates/:key` — Cập nhật hệ số (Admin/HR)

#### 5.3 Mô-đun 3: Quản lý & Khai Báo Timesheet (US-07→11)
```
src/modules/timesheets/
├── timesheets.module.ts
├── timesheets.controller.ts
├── timesheets.service.ts
└── dto/
    ├── create-timesheet-entry.dto.ts  ← Validate hoursSpent: min 0.5, max 24.0
    ├── query-timesheet.dto.ts
    └── reject-timesheet.dto.ts
```
- `GET /api/v1/timesheets/my-weekly` — Timesheet tuần của nhân viên
- `POST /api/v1/timesheets/entries` — Thêm/Cập nhật dòng khai giờ công
- `DELETE /api/v1/timesheets/entries/:id` — Xóa dòng khai
- `POST /api/v1/timesheets/:id/submit` — Gửi duyệt 2 cấp
- `GET /api/v1/timesheets/pending-approval` — Danh sách cần duyệt
- `PATCH /api/v1/timesheets/:id/approve` — Duyệt
- `PATCH /api/v1/timesheets/:id/reject` — Từ chối
- `GET /api/v1/timesheets/ot-summary` — Tổng hợp OT

#### 5.4 Mô-đun 4: Engine Phê Duyệt Đa Cấp (Approval Engine — US-12→14)
```
src/modules/approval/
├── approval.module.ts
├── approval-configs.controller.ts
├── approval-requests.controller.ts
├── approval.service.ts
└── dto/
    ├── update-approval-config.dto.ts
    ├── query-approval-request.dto.ts
    └── reject-request.dto.ts
```
- `GET /api/v1/approval-configs` — Danh sách ma trận cấu hình
- `PUT /api/v1/approval-configs/:transactionType` — Cấu hình cấp duyệt
- `GET /api/v1/approval-requests/my-submitted` — Phiếu đã nộp
- `GET /api/v1/approval-requests/pending-my-level` — Phiếu chờ duyệt
- `PATCH /api/v1/approval-requests/:id/approve` — Duyệt (auto chuyển cấp)
- `PATCH /api/v1/approval-requests/:id/reject` — Từ chối
- `GET /api/v1/approval-requests/:id/history` — Lịch sử vết duyệt

#### 5.5 Mô-đun 5: Onboarding Tiếp Nhận Nhân Viên Mới (US-15→18)
```
src/modules/onboarding/
├── onboarding.module.ts
├── onboarding.controller.ts
├── onboarding.service.ts
└── dto/
    ├── initiate-onboarding.dto.ts
    ├── assign-task.dto.ts
    └── update-task-status.dto.ts
```
- `POST /api/v1/onboarding/initiate` — Khởi tạo hồ sơ tiếp nhận (sinh mã NV, tạo user, bắn ticket)
- `GET /api/v1/onboarding/tasks/my-department` — Task tiếp nhận theo phòng ban
- `PATCH /api/v1/onboarding/tasks/:id/assign` — Phân công task
- `PATCH /api/v1/onboarding/tasks/:id/status` — Cập nhật tiến độ
- `GET /api/v1/onboarding/dashboard` — Dashboard tiến độ Onboarding
- `PATCH /api/v1/onboarding/employees/:id/promote` — Chuyển chính thức (OFFICIAL)

#### 5.6 Mô-đun 6: Offboarding & Thanh lý Hợp đồng (US-19→22)
```
src/modules/offboarding/
├── offboarding.module.ts
├── offboarding.controller.ts
├── offboarding.service.ts
└── dto/
    ├── resignation-request.dto.ts
    ├── update-task-status.dto.ts
    └── final-settlement.dto.ts
```
- `POST /api/v1/offboarding/resignation-request` — Nộp đơn thôi việc (duyệt 3 cấp)
- `GET /api/v1/offboarding/tasks/my-department` — Task thu hồi tài sản
- `PATCH /api/v1/offboarding/tasks/:id/status` — Cập nhật bàn giao
- `POST /api/v1/offboarding/final-settlement` — Quyết toán lương
- `PATCH /api/v1/offboarding/employees/:id/terminate` — Chốt thanh lý (TERMINATED)

#### 5.7 Mô-đun 7: Quản lý Thay Đổi Nhân Sự & Tăng Lương (US-23a→23d)
```
src/modules/employees/
├── employees.module.ts
├── employees.controller.ts
├── employees.service.ts
└── dto/
    ├── update-personal-info.dto.ts     ← Validate email, phone, taxCode theo 05_business_values.md
    ├── create-job-transfer.dto.ts
    ├── create-salary-adjustment.dto.ts
    └── create-discipline-reward.dto.ts
```
- `PATCH /api/v1/employees/:id/personal-info` — Cập nhật thông tin cá nhân (Group A)
- `POST /api/v1/employees/job-transfers` — Điều chuyển công tác (Group B, duyệt 2 cấp)
- `GET /api/v1/employees/:id/job-history` — Lịch sử điều chuyển
- `POST /api/v1/employees/salary-adjustments` — Tăng lương (Group C, duyệt 3 cấp)
- `GET /api/v1/employees/:id/salary-history` — Lịch sử biến động lương
- `POST /api/v1/employees/discipline-rewards` — Khen thưởng/Kỷ luật (Group D)

#### 5.8 Mô-đun 8: Chấm công, Nghỉ phép & Bảng Lương (US-24→26)
```
src/modules/attendance/
├── attendance.module.ts
├── attendance.controller.ts
├── attendance.service.ts
└── dto/

src/modules/leave-requests/
├── leave-requests.module.ts
├── leave-requests.controller.ts
├── leave-requests.service.ts
└── dto/
    └── create-leave-request.dto.ts

src/modules/payroll/
├── payroll.module.ts
├── payroll.controller.ts
├── payroll.service.ts
└── dto/
```
- `POST /api/v1/attendance/check-in` — Check-in
- `POST /api/v1/attendance/check-out` — Check-out
- `POST /api/v1/leave-requests` — Nộp đơn nghỉ phép (tự tra cứu 1 hoặc 2 cấp duyệt)
- `GET /api/v1/leave-requests/my-requests` — Lịch sử đơn nghỉ
- `POST /api/v1/payroll/calculate-monthly` — Tính lương tháng
- `PATCH /api/v1/payroll/:id/approve` — Duyệt bảng lương (2 cấp)
- `GET /api/v1/payroll/my-payslip` — Xem phiếu lương

---

### Supporting Modules (Master Data — theo `02_domain_model.md`)

Các entity là dữ liệu nền tảng (master data) không thuộc 8 mô-đun nghiệp vụ chính nhưng cần CRUD cơ bản để các module khác hoạt động. Tham chiếu: `02_domain_model.md` entities 1.4, 1.5, 1.11, 1.12, 1.16.

#### Departments (Entity 1.11 — `departments`, DB bảng 5)
```
src/modules/departments/
├── departments.module.ts
├── departments.controller.ts
├── departments.service.ts
└── dto/
    ├── create-department.dto.ts
    └── update-department.dto.ts
```

#### Positions (Entity 1.12 — `positions`, DB bảng 6)
```
src/modules/positions/
├── positions.module.ts
├── positions.controller.ts
├── positions.service.ts
└── dto/
    ├── create-position.dto.ts
    └── update-position.dto.ts
```

#### Projects & ProjectTasks (Entity 1.4 + 1.5 — `projects` + `project_tasks`, DB bảng 7 + 8)

Timesheet entries (`timesheets/entries`) yêu cầu chọn Dự án + Công việc, nên cần CRUD cho Projects trước khi Mô-đun 3 (Timesheet) hoạt động.

```
src/modules/projects/
├── projects.module.ts
├── projects.controller.ts
├── projects.service.ts
└── dto/
    ├── create-project.dto.ts
    ├── update-project.dto.ts
    ├── create-project-task.dto.ts
    └── update-project-task.dto.ts
```
- Phương thức theo `02_domain_model.md`: `createProject()`, `assignPM()`, `calculateTotalLaborHours()`
- `ProjectTask`: `createTask()`, `assignMember()`

#### Notifications (Entity 1.16 — `notifications`, DB bảng 16)

Nhiều mô-đun nghiệp vụ cần "bắn Notification" (Approval Engine bắn noti cho approver cấp tiếp theo, Onboarding bắn ticket cho IT/Admin, Offboarding bắn task thu hồi). Tham chiếu: `03_workflows.md` mục 5, 6, 7.

```
src/modules/notifications/
├── notifications.module.ts
├── notifications.controller.ts
├── notifications.service.ts
└── dto/
```
- Phương thức theo `02_domain_model.md`: `sendNotification()`, `markAsRead()`, `getUnreadCount()`

---

### Phase 6: Cập nhật Main & Global Prefix

#### [MODIFY] `src/main.ts`
- Thêm `app.setGlobalPrefix('api/v1')` — RESTful API prefix chuẩn theo `04_architecture.md`
- Đăng ký Global Exception Filter (`HttpExceptionFilter`) trả đúng format i18n

---

## Verification Plan

### Automated Tests
```bash
# 1. Build kiểm tra TypeScript compilation
cd backend && npm run build

# 2. Chạy dev server
npm run start:dev

# 3. Test health check
curl http://localhost:8080/api/v1

# 4. Test CRUD endpoints (sau khi có DB)
curl http://localhost:8080/api/v1/departments
curl http://localhost:8080/api/v1/positions
curl http://localhost:8080/api/v1/projects
curl http://localhost:8080/api/v1/employees
```

### Manual Verification
- Build thành công không có TypeScript errors
- Tất cả 21 entities compile đúng relation mapping
- Exception filter trả đúng format `{ statusCode, errorCode, i18nKey, params, timestamp }`
