# Backend - Hệ Thống Quản Lý Nhân Sự (HRM System)

Mô-đun máy chủ (Backend) cho ứng dụng Quản Lý Nhân Sự (HRM), được xây dựng bằng **NestJS** trên nền tảng **TypeScript**, áp dụng mô hình phân lớp (Layered Architecture) chặt chẽ và chuẩn hóa mã lỗi trả về dạng `i18nKey`.

---

## 🚀 Công Nghệ Sử Dụng

- **Framework:** NestJS (Node.js + TypeScript)
- **Kiến Trúc:** Mô hình Phân lớp 3 lớp tiêu chuẩn (`Controller` $\rightarrow$ `Service` $\rightarrow$ `Repository`)
- **Strict Type Safety:** TypeScript (`.ts` / `.tsx`) + Class Validator (`class-validator`, `class-transformer`)
- **Quản lý Cấu hình:** `@nestjs/config`
- **Chuẩn Hóa Mã Lỗi:** Trả về định dạng JSON lỗi kèm `i18nKey` cho Frontend hiển thị đa ngôn ngữ
- **An Ninh & Bảo Mật:** JWT Bearer Token, Guard phân quyền theo vai trò (RBAC), Global ValidationPipe

---

## 📁 Cấu Trúc Thư Mục

```text
backend/
├── src/
│   ├── common/
│   │   ├── enums/            # Định nghĩa toàn bộ Enums nghiệp vụ (UserRole, EmployeeStatus, WorkType...)
│   │   ├── filters/          # Global Exception Filter xử lý lỗi & trả về i18nKey
│   │   └── guards/           # Auth & RBAC Authorization Guards
│   ├── modules/
│   │   ├── audit-log/        # Module lưu vết nhật ký giao dịch toàn hệ thống
│   │   ├── auth/             # Module xác thực đăng nhập & JWT
│   │   ├── employee/         # Module quản lý hồ sơ nhân viên, Onboarding/Offboarding
│   │   ├── timesheet/        # Module khai báo & phê duyệt Timesheet tuần
│   │   ├── approval/         # Engine phê duyệt đa cấp (1 đến 4 cấp)
│   │   └── payroll/          # Module chạy thuật toán tính lương tháng
│   ├── app.module.ts         # Module gốc tích hợp các module nghiệp vụ
│   ├── app.controller.ts     # Healthcheck controller
│   └── main.ts               # Entry point khởi tạo ứng dụng & Global ValidationPipe
├── test/                     # Thư mục chứa E2E & Unit Tests
├── nest-cli.json             # Cấu hình Nest CLI
├── package.json              # Khai báo phụ thuộc & npm scripts
├── tsconfig.json             # Cấu hình trình biên dịch TypeScript
└── README.md                 # Tài liệu hướng dẫn mô-đun Backend
```

---

## 🛠 Hướng Dẫn Cài Đặt & Chạy Ứng Dụng

### 1. Cài đặt dependencies
Chạy lệnh sau tại thư mục `backend`:

```bash
cd backend
npm install
```

### 2. Chạy môi trường Development
```bash
npm run start:dev
```

Máy chủ Backend sẽ chạy mặc định tại địa chỉ: `http://localhost:8080` (hoặc cổng cấu hình trong file `.env`).

### 3. Biên dịch ứng dụng (Production Build)
```bash
npm run build
```

Mã nguồn TypeScript sau khi biên dịch ra JavaScript sẽ nằm trong thư mục `dist/`.

### 4. Chạy sản phẩm đã biên dịch
```bash
npm run start:prod
```

---

## ✨ Chức Năng Nổi Bật Phía Backend

1. **Engine Phê Duyệt Đa Cấp (Multi-Level Approval Engine):**
   - Hỗ trợ ma trận phê duyệt linh hoạt từ 1 đến 4 cấp (Chủ tịch $\rightarrow$ Giám đốc $\rightarrow$ Trưởng phòng/PM $\rightarrow$ Nhân viên) theo tầm quan trọng của giao dịch.
2. **Cấu Hình Động Hệ Số Giờ Công & OT (Dynamic Work Rate Engine):**
   - Quản lý và nạp động các hệ số làm thêm giờ (`OT_RATE_WEEKDAY`, `OT_RATE_WEEKEND`, `OT_RATE_HOLIDAY`, `NIGHT_SHIFT_BONUS`) từ CSDL thay vì hardcode trong code.
3. **Nhật Ký Lưu Vết Giao Dịch Bất Biến (System Audit Trail):**
   - Tự động đánh chặn và ghi vết 100% các thao tác `CREATE`, `UPDATE`, `DELETE`, `APPROVE`, `REJECT` kèm snapshot dữ liệu Trước vs. Sau (Diff View) phục vụ Admin tra cứu.
4. **Kiểm Tra Dữ Liệu Nghiêm Ngặt & Localized Error Handling:**
   - Kiểm tra chặt chẽ cấu trúc DTO ở tầng Controller.
   - Trả về mã lỗi định dạng `i18nKey` giúp Frontend tự động dịch thông báo theo ngôn ngữ người dùng chọn.
