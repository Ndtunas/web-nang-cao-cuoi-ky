# Hệ Thống Quản Lý Nhân Sự (HRM System)

Hệ thống quản lý nhân sự toàn diện cho doanh nghiệp, hỗ trợ quy trình **Onboarding → Làm việc → Nghỉ phép → Điều chuyển → Tính lương → Offboarding**, tích hợp phê duyệt đa cấp và nhật ký kiểm toán bất biến.

## Tổng Quan

| Thành phần | Công nghệ |
|---|---|
| **Frontend** | React 19, Vite, Ant Design v6, i18next (vi/en) |
| **Backend** | NestJS 11 (TypeScript), TypeORM, PostgreSQL, JWT + RBAC |
| **Database** | PostgreSQL 14+ (21 bảng, trigger sinh `emp_code`, JSONB audit log) |
| **Tác vụ định kỳ** | `@nestjs/schedule` cron job |

---

## Tính Năng Chính

### 1. Dashboard & Thống Kê
- Tổng quan nhân sự: tổng NV, đang làm việc, nghỉ phép, tuyển mới (theo tháng).
- Biểu đồ tuyển dụng & cơ cấu phòng ban.
- Widget "Yêu cầu cần duyệt nhanh" cho cấp duyệt hiện tại.

### 2. Quản Lý Hồ Sơ Nhân Viên
- CRUD nhân viên với mã NV tự sinh (`BaoLM`, `BaoLM2`).
- Lịch sử điều chuyển, lịch sử tăng/giảm lương.
- Khen thưởng / Kỷ luật.
- Đánh dấu nhân viên nghỉ việc (terminate).
- Phân quyền: `ADMIN`, `DEPT_LEAD` được xem toàn bộ; `EMPLOYEE` chỉ xem bản thân.

### 3. Phòng Ban & Chức Vụ
- CRUD phòng ban (`/departments`) — quản lý theo `ADMIN`.
- CRUD chức vụ (`/positions`) — quản lý theo `ADMIN`.
- Cascade delete có kiểm tra ràng buộc.

### 4. Onboarding (Tuyển mới)
- Khởi tạo onboarding cho nhân viên mới → tạo `User` + `Employee` + tự động sinh `empCode` từ trigger DB.
- Tự động tạo 4 checklist tasks giao cho HR / IT / Admin.
- Tài khoản mặc định với mật khẩu `Temp@{empCode}{dob}` (bcrypt hashed).
- Theo dõi tiến độ checklist (Steps UI).
- Đánh giá thử việc → chuyển trạng thái `OFFICIAL`.

### 5. Offboarding (Nghỉ việc)
- Nhân viên gửi đơn nghỉ việc với lý do + ngày nghỉ việc cuối cùng.
- Tự động tạo 3 checklist tasks: thu hồi tài sản, bàn giao công việc, tất toán lương & BHXH.
- Tiến độ checklist realtime.

### 6. Đơn Nghỉ Phép
- Phân biệt **nghỉ ngắn hạn** (≤ 2 ngày, 1 cấp duyệt) và **nghỉ dài hạn** (> 2 ngày, 2 cấp duyệt).
- Theo dõi trạng thái: `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`.
- Tự động tạo notification cho cấp duyệt kế tiếp.

### 7. Timesheet & Chấm Công
- Khai báo timesheet tuần (auto-prefill 8h/ngày trong tuần).
- Cron job `23:59:30` tự finalize các bản ghi chưa checkout về `18:00`.
- Reconciliation banner cảnh báo chênh lệch giữa khai báo và thực tế.
- Phê duyệt Timesheet qua Approval Engine.

### 8. Chấm Công (Attendance)
- Check-in / Check-out với cửa sổ thời gian (trước 13:30, sau 13:30, sau 15:30).
- Tự động tính `OVERTIME`, `HALF_DAY`, `ABSENT` theo rule.
- Cảnh báo lỗi `ERR_ATT_001/002` nếu chấm công ngoài khung giờ.

### 9. Tính Lương (Payroll)
- Chạy thuật toán tính lương tháng cho toàn bộ nhân viên.
- Hỗ trợ cấu hình hệ số OT (`OT_RATE_WEEKDAY`, `OT_RATE_WEEKEND`, `OT_RATE_HOLIDAY`), `NIGHT_SHIFT_BONUS` động.
- Xuất bảng lương Excel qua `exceljs`.

### 10. Dự Án (Projects)
- CRUD dự án, gán nhân viên vào task.
- Phục vụ việc khai báo timesheet theo dự án.

### 11. Approval Engine (Phê Duyệt Đa Cấp)
- Ma trận phê duyệt linh hoạt 1 - 4 cấp (`CHAIRMAN` → `DIRECTOR` → `DEPT_LEAD` → `EMPLOYEE`).
- Áp dụng cho tất cả giao dịch: nghỉ phép, điều chuyển, tăng/giảm lương, timesheet, offboarding.
- Notification tự động cho cấp duyệt kế tiếp + thông báo kết quả cuối cùng cho người yêu cầu.
- Click notification → mở modal chi tiết yêu cầu tương ứng (`referenceEntityId`).

### 12. Notifications
- Bell icon ở header với badge đếm tin chưa đọc (poll mỗi 5s).
- Click thông báo → tự động chuyển sang tab Phê duyệt + mở modal chi tiết.
- Đánh dấu đã đọc / đánh dấu tất cả đã đọc.

### 13. System Audit Logs
- Ghi vết tự động 100% các thao tác `CREATE`, `UPDATE`, `DELETE`, `APPROVE`, `REJECT` với JSONB snapshot trước/sau.
- Admin tra cứu theo user, bảng, khoảng thời gian.

### 14. Multi-language (i18n)
- 2 ngôn ngữ: Tiếng Việt (`vi`, mặc định) và Tiếng Anh (`en`).
- Đồng bộ giữa `i18next` và `ConfigProvider` của Ant Design.
- Không pha trộn Anh - Việt: mỗi ngôn ngữ là bản dịch chuẩn mực doanh nghiệp.

---

## Cấu Trúc Dự Án

```text
web-nang-cao-cuoi-ky/
├── backend/                   # NestJS API server
│   ├── src/
│   │   ├── common/            # Enums, guards, filters, exceptions
│   │   ├── entities/          # TypeORM entities (21 bảng)
│   │   ├── modules/           # 16 modules nghiệp vụ
│   │   │   ├── approval/      # Approval Engine
│   │   │   ├── attendance/    # Chấm công + cron
│   │   │   ├── audit-logs/    # Nhật ký kiểm toán
│   │   │   ├── auth/          # JWT + RBAC
│   │   │   ├── config/        # System config
│   │   │   ├── departments/   # Phòng ban
│   │   │   ├── employees/     # Hồ sơ nhân viên
│   │   │   ├── exports/       # Xuất Excel
│   │   │   ├── leave-requests/# Đơn nghỉ phép
│   │   │   ├── notifications/ # Thông báo
│   │   │   ├── offboarding/   # Nghỉ việc
│   │   │   ├── onboarding/    # Tuyển mới
│   │   │   ├── payroll/       # Tính lương
│   │   │   ├── positions/     # Chức vụ
│   │   │   ├── projects/      # Dự án
│   │   │   ├── timesheets/    # Timesheet tuần
│   │   │   └── users/         # Quản lý tài khoản
│   │   ├── app.module.ts
│   │   ├── app.controller.ts
│   │   └── main.ts
│   ├── .env                   # DB_HOST, DB_PORT, JWT_SECRET...
│   ├── package.json
│   └── README.md
├── frontend/                  # React + Vite SPA
│   ├── src/
│   │   ├── components/        # 15 màn hình (Dashboard, Employees, ApprovalCenter...)
│   │   ├── services/          # 16 service wrappers (auth, employees, attendance...)
│   │   ├── locales/           # vi.json, en.json
│   │   ├── constants/         # roles.js, TAB_KEYS
│   │   ├── App.jsx            # Layout chính + routing tab
│   │   ├── i18n.js            # Cấu hình i18next
│   │   └── main.jsx
│   ├── vite.config.js         # Proxy /api → localhost:8080
│   ├── package.json
│   └── README.md
├── database/
│   ├── 03_schema.sql          # 21 bảng + indexes + triggers
│   ├── migrations/            # SQL migration scripts
│   ├── seed/                  # Dữ liệu mẫu
│   └── README.md
├── business/                  # Tài liệu nghiệp vụ (USR stories)
├── layout/                    # Wireframe / UI design
└── README.md                  # File này
```

---

## Hướng Dẫn Cài Đặt & Chạy

### Yêu Cầu Hệ Thống
- Node.js ≥ 18
- PostgreSQL ≥ 14
- npm ≥ 9

### 1) Database
```bash
psql -U postgres -c "CREATE DATABASE hrm_system;"
psql -U postgres -d hrm_system -f database/03_schema.sql
psql -U postgres -d hrm_system -f database/seed/01_initial_data.sql
psql -U postgres -d hrm_system -f database/migrations/001_add_reference_entity_id.sql
```

### 2) Backend
```bash
cd backend
npm install
# Cấu hình .env (DB_HOST, DB_USERNAME, DB_PASSWORD, JWT_SECRET)
npm run start:dev
```
Backend chạy tại `http://localhost:8080`.

### 3) Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend chạy tại `http://localhost:5173`. Vite đã proxy `/api` → `localhost:8080`.

### 4) Tài Khoản Mặc Định (Sau khi seed)

| Username | Password | Role |
|---|---|---|
| `admin` | `admin123` | ADMIN |
| `director` | `director123` | DIRECTOR |
| `dept_lead` | `dept_lead123` | DEPT_LEAD |
| `employee` | `employee123` | EMPLOYEE |

---

## API Endpoints Chính

| Endpoint | Method | Mô tả |
|---|---|---|
| `/auth/login` | POST | Đăng nhập → JWT |
| `/employees` | GET / POST | Danh sách / tạo nhân viên |
| `/employees/stats` | GET | Thống kê dashboard |
| `/employees/:id/personal-info` | PATCH | Cập nhật hồ sơ |
| `/employees/:id/job-transfers` | POST | Điều chuyển |
| `/employees/:id/salary-adjustments` | POST | Tăng/giảm lương |
| `/employees/:id/promote` | PATCH | Đánh giá thử việc → OFFICIAL |
| `/departments` | GET / POST / PATCH / DELETE | CRUD phòng ban |
| `/positions` | GET / POST / PATCH / DELETE | CRUD chức vụ |
| `/onboarding/initiate` | POST | Khởi tạo onboarding |
| `/onboarding/tasks` | GET | Lấy tất cả tasks pending |
| `/onboarding/employee/:id` | GET | Tasks theo nhân viên |
| `/onboarding/tasks/:id/complete` | PATCH | Hoàn tất task |
| `/onboarding/promote/:id` | PATCH | OFFICIAL |
| `/offboarding/initiate` | POST | Gửi đơn nghỉ việc |
| `/leave-requests` | GET / POST | Đơn nghỉ phép |
| `/timesheets/entries` | GET / POST | Timesheet tuần |
| `/timesheets/submit` | POST | Submit tuần cho duyệt |
| `/attendance/check-in` | POST | Check-in |
| `/attendance/check-out` | POST | Check-out |
| `/attendance/today` | GET | Bản ghi hôm nay |
| `/payroll/calculate` | POST | Tính lương tháng |
| `/approval-requests/pending-my-level` | GET | Yêu cầu chờ duyệt |
| `/approval-requests/my-submitted` | GET | Yêu cầu tôi gửi |
| `/approval-requests/:id/approve` | PATCH | Phê duyệt |
| `/approval-requests/:id/reject` | PATCH | Từ chối |
| `/approval-requests/:id/detail` | GET | Chi tiết yêu cầu |
| `/approval-requests/:id/history` | GET | Lịch sử duyệt |
| `/notifications` | GET | Danh sách thông báo |
| `/notifications/unread-count` | GET | Đếm chưa đọc |
| `/notifications/:id/read` | PATCH | Đánh dấu đã đọc |
| `/audit-logs` | GET | Tra cứu audit log |

---

## Vai Trò & Phân Quyền

| Role | Quyền truy cập |
|---|---|
| `ADMIN` | Toàn quyền hệ thống |
| `CHAIRMAN` | Duyệt cấp cao nhất, xem dashboard |
| `DIRECTOR` | Duyệt cấp 2, xem payroll |
| `DEPT_LEAD` | Duyệt cấp 1, quản lý nhân viên phòng ban |
| `EMPLOYEE` | Tự khai báo timesheet, gửi đơn nghỉ phép, xem "Yêu cầu của tôi" |

---

## Lỗi Chuẩn Hóa (i18nKey)

Backend trả về lỗi định dạng `{ code, i18nKey, message }`. Frontend dịch `i18nKey` sang ngôn ngữ hiện tại.

| i18nKey | Ý nghĩa |
|---|---|
| `ERR_AUTH_001` | Không tìm thấy user |
| `ERR_AUTH_003` | Không tìm thấy nhân viên |
| `ERR_EMP_001` | Email đã tồn tại / DTO thiếu field |
| `ERR_APPROVAL_003` | Không tìm thấy yêu cầu |
| `ERR_ATT_001` | Check-in ngoài khung giờ |
| `ERR_ATT_002` | Check-out ngoài khung giờ |
| `ERR_UNKNOWN` | Lỗi không xác định |

---

## Phát Triển Thêm

- Backend lint: `cd backend && npm run lint`
- Backend tests: `cd backend && npm run test`
- Frontend lint: `cd frontend && npm run lint`
- Frontend build: `cd frontend && npm run build`