# Backend - Hệ Thống Quản Lý Nhân Sự (HRM)

Mô-đun máy chủ (Backend) cho ứng dụng Quản Lý Nhân Sự, xây dựng bằng **NestJS 11** + **TypeScript**, áp dụng mô hình phân lớp 3 lớp (Controller → Service → Repository), chuẩn hóa mã lỗi trả về `i18nKey`, và phân quyền theo vai trò (RBAC).

---

## Công Nghệ

| Thành phần | Chi tiết |
|---|---|
| Framework | NestJS 11 (Node.js + TypeScript) |
| ORM | TypeORM 11 với PostgreSQL |
| Auth | JWT Bearer + `@nestjs/passport` |
| Validation | `class-validator` + `class-transformer` |
| Cron Job | `@nestjs/schedule` |
| Logging | `nestjs-pino` |
| Password | `bcrypt` |
| Excel Export | `exceljs` |

---

## Cấu Trúc Thư Mục

```text
backend/
├── src/
│   ├── common/
│   │   ├── enums/             # UserRole, EmployeeStatus, WorkType...
│   │   ├── exceptions/       # BusinessException
│   │   ├── filters/          # Global Exception Filter → trả về i18nKey
│   │   └── guards/           # JwtAuthGuard, RolesGuard
│   ├── database/             # DatabaseLogger, custom logging
│   ├── entities/             # 21 TypeORM entities (1-1 với 21 bảng)
│   ├── modules/              # 16 module nghiệp vụ
│   │   ├── approval/         # Multi-level approval engine
│   │   ├── attendance/       # Check-in/out + cron job
│   │   ├── audit-logs/       # Auto-log every CREATE/UPDATE/DELETE
│   │   ├── auth/             # Login + JWT
│   │   ├── config/           # System config (work rate, OT...)
│   │   ├── departments/      # Phòng ban
│   │   ├── employees/        # Hồ sơ + lịch sử điều chuyển/lương
│   │   ├── exports/          # Xuất Excel
│   │   ├── leave-requests/   # Đơn nghỉ phép
│   │   ├── notifications/    # Thông báo + REST endpoints
│   │   ├── offboarding/      # Quy trình nghỉ việc
│   │   ├── onboarding/       # Tuyển mới + checklist
│   │   ├── payroll/          # Tính lương tháng
│   │   ├── positions/        # Chức vụ
│   │   ├── projects/         # Dự án
│   │   ├── timesheets/       # Timesheet tuần
│   │   └── users/            # Tài khoản + phân quyền
│   ├── app.module.ts
│   ├── app.controller.ts
│   └── main.ts
├── scripts/                  # hash-seed.mjs
├── test/                     # E2E + unit tests
├── .env                      # DB_HOST, JWT_SECRET, PORT
├── package.json
└── README.md
```

---

## Cài Đặt & Chạy

### 1. Cài dependencies
```bash
cd backend
npm install
```

### 2. Cấu hình `.env`
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=fcvn
DB_PASSWORD=your_password
DB_DATABASE=hrm_system
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h
PORT=8080
DB_LOG_QUERIES=false
```

### 3. Chạy Development
```bash
npm run start:dev
```
Backend mặc định tại `http://localhost:8080`.

### 4. Production Build
```bash
npm run build          # Output → dist/
npm run start:prod
```

---

## Lệnh Khác

| Lệnh | Mô tả |
|---|---|
| `npm run lint` | ESLint với auto-fix |
| `npm run test` | Unit test (Jest) |
| `npm run test:e2e` | End-to-end test |
| `npm run hash:seed` | Băm lại password mẫu trong DB seed |

---

## Chuẩn Hóa Lỗi

Mọi exception đều được Global Exception Filter chuyển thành JSON `{ code, i18nKey, message, statusCode }`. Frontend dùng `i18nKey` để tra cứu bản dịch.

Ví dụ trong controller:
```ts
if (!employee) throw new BusinessException('ERR_EMP_001');
```

Response:
```json
{
  "code": "ERR_EMP_001",
  "i18nKey": "errors.ERR_EMP_001",
  "message": "Email already exists",
  "statusCode": 400
}
```

---

## Multi-Level Approval Engine

`ApprovalService` xử lý phê duyệt theo `ApprovalConfig` (1-4 cấp, mỗi cấp gắn với 1 role):
- `CHAIRMAN` → `DIRECTOR` → `DEPT_LEAD` → `EMPLOYEE`
- Khi submit: tạo `ApprovalRequest` với `currentLevel=1`, notify approvers của level 1.
- Khi approve: `currentLevel++`, notify approvers level tiếp theo (nếu còn).
- Khi đạt `currentLevel === totalLevels`: cập nhật trạng thái transaction gốc + notify requester kết quả.

---

## Cron Jobs

| Job | Lịch | Mô tả |
|---|---|---|
| Attendance auto-finalize | `30 23 * * *` | Tự finalize các bản ghi chưa checkout về 18:00 |

---

## Audit Trail

`AuditLogInterceptor` tự động ghi vết mọi request có side-effect (POST/PATCH/DELETE) với:
- `actorId`: user thực hiện
- `action`: `CREATE` / `UPDATE` / `DELETE` / `APPROVE` / `REJECT`
- `entity`: tên bảng
- `beforeData`, `afterData`: JSONB snapshot
- `createdAt`: timestamp

Tra cứu qua `GET /audit-logs` (chỉ ADMIN).