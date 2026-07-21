# 04. Kiến Trúc Phân Lớp & Quy Hoạch RESTful API Complete Specs

Tài liệu này mô tả chi tiết mô hình kiến trúc phân lớp (Layered Architecture - **Câu 4 trong đề thi**) và quy hoạch **100% RESTful API Specs** khớp từng luồng theo danh sách User Stories từ `01_user_stories.md`.

---

## 🏗 1. Mô Hình Kiến Trúc Phân Lớp (Layered Architecture)

Hệ thống được thiết kế theo mô hình 3 lớp tiêu chuẩn:

```text
       ┌─────────────────────────────────────────┐
       │   Client Layer (React + Ant Design)     │
       └────────────────────┬────────────────────┘
                            │ (HTTP / JSON + JWT Bearer)
       ┌────────────────────▼────────────────────┐
       │ 1. Controller Layer (HTTP Handler & DTO)│
       └────────────────────┬────────────────────┘
                            │ (Call Business Service)
       ┌────────────────────▼────────────────────┐
       │ 2. Service Layer (Business Logic Engine)│
       └────────────────────┬────────────────────┘
                            │ (ORM / Query Builder)
       ┌────────────────────▼────────────────────┐
       │ 3. Repository / Data Access Layer       │
       └────────────────────┬────────────────────┘
                            │ (SQL Driver)
       ┌────────────────────▼────────────────────┐
       │ Database Layer (PostgreSQL / MySQL)     │
       └─────────────────────────────────────────┘
```

---

## 🌐 2. Danh Sách RESTful API Specs Chi Tiết Theo Mô-đun

### 🔹 2.1 Mô-đun 1: Nhật Ký Lưu Vết Giao Dịch (System Audit Trail - US-01 đến US-03)
- `GET /api/v1/audit-logs` - Tra cứu nhật ký giao dịch toàn hệ thống (Lọc theo `fromDate`, `toDate`, `actorId`, `actionType`, `entityName`).
- `GET /api/v1/audit-logs/:id/diff` - Xem chi tiết so sánh khác biệt dữ liệu Trước vs. Sau (`oldData` vs. `newData`).

### 🔹 2.2 Mô-đun 2: Xác thực & Cấu hình Tham số Động (Auth & Dynamic Config - US-04 đến US-06)
- `POST /api/v1/auth/login` - Đăng nhập tài khoản, nhận JWT Access Token.
- `GET /api/v1/auth/profile` - Lấy thông tin tài khoản đang đăng nhập.
- `POST /api/v1/auth/change-password` - Đổi mật khẩu cá nhân.
- `PATCH /api/v1/users/:id/role` - Phân quyền vai trò người dùng (Admin).
- `GET /api/v1/config/work-rates` - Lấy danh sách hệ số giờ công & OT hiện tại (`WorkRateConfig`).
- `PUT /api/v1/config/work-rates/:key` - Cập nhật giá trị hệ số giờ công & OT động (Admin/HR).

### 🔹 2.3 Mô-đun 3: Quản lý & Khai Báo Timesheet (Timesheet Management - US-07 đến US-11)
- `GET /api/v1/timesheets/my-weekly` - Lấy bảng khai Timesheet tuần của nhân viên đang đăng nhập.
- `POST /api/v1/timesheets/entries` - Thêm / Cập nhật dòng khai giờ công (Chọn Dự án, Task, Giờ làm, Loại giờ `NORMAL`/`OT_WEEKDAY`/`OT_WEEKEND`/`OT_HOLIDAY`/`NIGHT_SHIFT`).
- `DELETE /api/v1/timesheets/entries/:id` - Xóa dòng khai Timesheet.
- `POST /api/v1/timesheets/:id/submit` - Gửi bảng Timesheet tuần lên luồng phê duyệt 2 cấp.
- `GET /api/v1/timesheets/pending-approval` - Lấy danh sách Timesheet cần duyệt (Dành cho PM Dự án & Trưởng phòng).
- `PATCH /api/v1/timesheets/:id/approve` - Duyệt Timesheet tuần.
- `PATCH /api/v1/timesheets/:id/reject` - Từ chối Timesheet tuần kèm ghi chú.
- `GET /api/v1/timesheets/ot-summary` - Tổng hợp số giờ OT đã duyệt để đẩy sang Bảng lương tháng.

### 🔹 2.4 Mô-đun 4: Engine Phê Duyệt Đa Cấp (Multi-Level Approval Engine - US-12 đến US-14)
- `GET /api/v1/approval-configs` - Lấy danh sách ma trận cấu hình cấp duyệt cho các loại giao dịch.
- `PUT /api/v1/approval-configs/:transactionType` - Cấu hình số cấp duyệt và trình tự vai trò duyệt.
- `GET /api/v1/approval-requests/my-submitted` - Xem danh sách phiếu yêu cầu đã nộp và theo dõi tiến độ cấp duyệt realtime (`CurrentLevel / TotalLevels`).
- `GET /api/v1/approval-requests/pending-my-level` - Lấy danh sách phiếu yêu cầu đang chờ cấp của mình duyệt.
- `PATCH /api/v1/approval-requests/:id/approve` - Duyệt phiếu yêu cầu ở cấp hiện tại (Tự động chuyển cấp tiếp theo hoặc hoàn tất).
- `PATCH /api/v1/approval-requests/:id/reject` - Từ chối phiếu yêu cầu kèm ghi chú lý do.
- `GET /api/v1/approval-requests/:id/history` - Xem nhật ký lịch sử vết duyệt qua từng cấp (`ApprovalStepHistory`).

### 🔹 2.5 Mô-đun 5: Quy trình Onboarding Tiếp Nhận Nhân Viên Mới (US-15 đến US-18)
- `POST /api/v1/onboarding/initiate` - Khởi tạo hồ sơ tiếp nhận nhân viên mới (Sinh mã NV, tạo user & bắn ticket các phòng).
- `GET /api/v1/onboarding/tasks/my-department` - Lấy danh sách task tiếp nhận của phòng ban (HR, IT, Admin, Manager).
- `PATCH /api/v1/onboarding/tasks/:id/assign` - Lead phân công (Assign/Delegate) task tiếp nhận cho nhân viên cấp dưới.
- `PATCH /api/v1/onboarding/tasks/:id/status` - Cập nhật tiến độ hoàn thành task (`IN_PROGRESS` -> `COMPLETED`).
- `GET /api/v1/onboarding/dashboard` - Dashboard theo dõi tiến độ Onboarding realtime.
- `PATCH /api/v1/onboarding/employees/:id/promote` - Đánh giá đạt thử việc và chuyển trạng thái chính thức (`OFFICIAL`).

### 🔹 2.6 Mô-đun 6: Quy trình Offboarding & Thanh lý Hợp đồng (US-19 đến US-22)
- `POST /api/v1/offboarding/resignation-request` - Nộp đơn xin thôi việc trực tuyến (Kích hoạt duyệt 3 cấp).
- `GET /api/v1/offboarding/tasks/my-department` - Lấy danh sách task thu hồi tài sản & khóa tài khoản (IT, Admin, HR).
- `PATCH /api/v1/offboarding/tasks/:id/status` - Cập nhật trạng thái hoàn tất bàn giao.
- `POST /api/v1/offboarding/final-settlement` - Tính quyết toán lương & đền bù ngày phép tồn chưa sử dụng.
- `PATCH /api/v1/offboarding/employees/:id/terminate` - Chốt hoàn tất thanh lý hợp đồng (`TERMINATED`).

### 🔹 2.7 Mô-đun 7: Quản lý Các Loại Thay Đổi Nhân Sự & Tăng Lương (US-23a đến US-23d)
- `PATCH /api/v1/employees/:id/personal-info` - Cập nhật Thông tin cá nhân & liên hệ (Group A).
- `POST /api/v1/employees/job-transfers` - Lập Quyết định Điều chuyển công tác (Group B - Kích hoạt duyệt 2 cấp).
- `GET /api/v1/employees/:id/job-history` - Xem lịch sử quá trình công tác & điều chuyển (`JobHistory`).
- `POST /api/v1/employees/salary-adjustments` - Lập Yêu cầu Tăng lương / Phụ cấp (Group C - Kích hoạt duyệt 3 cấp).
- `GET /api/v1/employees/:id/salary-history` - Xem lịch sử biến động lương & phụ cấp (`SalaryHistory`).
- `POST /api/v1/employees/discipline-rewards` - Ghi nhận Quyết định Khen thưởng / Kỷ luật (Group D).

### 🔹 2.8 Mô-đun 8: Chấm công, Đơn Nghỉ Phép & Bảng Lương (US-24 đến US-26)
- `POST /api/v1/attendance/check-in` - Ghi nhận Check-in giờ vào.
- `POST /api/v1/attendance/check-out` - Ghi nhận Check-out giờ ra.
- `POST /api/v1/leave-requests` - Nộp đơn xin nghỉ phép (Tự động tra cứu số cấp duyệt 1 hoặc 2 cấp).
- `GET /api/v1/leave-requests/my-requests` - Lấy lịch sử đơn xin nghỉ phép cá nhân.
- `POST /api/v1/payroll/calculate-monthly` - Chạy thuật toán tính lương tháng (Nạp biến động `WorkRateConfig` & Tiền OT từ Timesheet).
- `PATCH /api/v1/payroll/:id/approve` - Duyệt chốt bảng lương tháng (Duyệt 2 cấp).
- `GET /api/v1/payroll/my-payslip` - Xem phiếu lương (Payslip) cá nhân hàng tháng.

---

## 📋 3. Checklist Phủ Khớp API Specs vs User Stories (API Coverage Checklist)

| User Story Code | Tên Nghiệp Vụ trong User Story | RESTful API Endpoint Đáp Ứng | Trạng Thái Phủ Khớp |
| :--- | :--- | :--- | :---: |
| **US-01, 02, 03** | Lưu vết giao dịch & Diff view | `GET /api/v1/audit-logs`, `GET /.../diff` | ✅ Phủ 100% |
| **US-04, 05** | Xác thực đăng nhập, RBAC & đổi mật khẩu | `POST /api/v1/auth/login`, `POST /.../change-password` | ✅ Phủ 100% |
| **US-06** | Cấu hình động hệ số giờ công & OT | `GET & PUT /api/v1/config/work-rates` | ✅ Phủ 100% |
| **US-07, 08, 09, 10, 11**| Khai & duyệt Timesheet tuần, tính OT | `POST /api/v1/timesheets/entries`, `PATCH /.../approve` | ✅ Phủ 100% |
| **US-12, 13, 14** | Phê duyệt đa cấp (Matrix, Submit, Approve) | `GET /.../pending-my-level`, `PATCH /.../approve` | ✅ Phủ 100% |
| **US-15, 16, 17, 18** | Onboarding liên phòng ban (IT, Admin, Manager)| `POST /.../onboarding/initiate`, `PATCH /.../assign` | ✅ Phủ 100% |
| **US-19, 20, 21, 22** | Offboarding 3 cấp & Quyết toán thanh lý | `POST /.../resignation-request`, `POST /.../final-settlement`| ✅ Phủ 100% |
| **US-23a, 23b, 23c, 23d**| 4 loại thay đổi nhân sự (Personal, Transfer, Salary)| `POST /.../job-transfers`, `POST /.../salary-adjustments` | ✅ Phủ 100% |
| **US-24a, 24b** | Chấm công & Đơn xin nghỉ phép | `POST /api/v1/leave-requests`, `POST /.../check-in` | ✅ Phủ 100% |
| **US-25, 26** | Thuật toán tính lương tháng & Payslip | `POST /.../payroll/calculate-monthly`, `GET /.../my-payslip`| ✅ Phủ 100% |
