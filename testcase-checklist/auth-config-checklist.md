# TEST CASE CHECKLIST - AUTHENTICATION, ROLES & DYNAMIC CONFIGURATION

Hệ thống kiểm thử tự động End-to-End (E2E) cho phân hệ Xác thực (Authentication), Phân quyền (RBAC), Quy trình phê duyệt reset mật khẩu (Password Reset Approval Workflow), và Cấu hình tham số hệ thống (Work Rate Configuration).

---

## 📊 Tóm tắt kết quả kiểm thử
- **Tổng số Test Case:** 17
- **Đạt (Pass):** 17 / 17 (100%)
- **Thất bại (Fail):** 0
- **Môi trường chạy:** Local/E2E Testing Context (PostgreSQL, NestJS Testing Environment)
- **Công cụ kiểm thử:** Jest, Supertest

---

## 📋 Chi tiết Test Case Checklist

### 1. Phân hệ Xác thực & Refresh Token (Authentication Flows)

| TC ID | Kịch bản kiểm thử | Dữ liệu đầu vào | Các bước thực hiện | Kết quả mong đợi | Trạng thái | Mã nguồn Test |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-AUTH-01** | Đăng nhập tài khoản Admin hệ thống thành công | `{ username: "admin", password: "Admin@123" }` | 1. Gửi request POST `/api/v1/auth/login`<br>2. Kiểm tra status code & data trả về | - Trả về HTTP 201<br>- Trả về JWT Access Token & Refresh Token<br>- User Role trả về là `ADMIN` | **PASS** | `auth.e2e-spec.ts:48` |
| **TC-AUTH-02** | Đăng nhập tài khoản Nhân viên thành công | `{ username: "employee", password: "Password@123" }` | 1. Gửi request POST `/api/v1/auth/login`<br>2. Kiểm tra status code & data trả về | - Trả về HTTP 201<br>- Trả về JWT Access Token & Refresh Token<br>- User Role trả về là `EMPLOYEE` | **PASS** | `auth.e2e-spec.ts:60` |
| **TC-AUTH-03** | Đăng nhập tài khoản Trưởng phòng thành công | `{ username: "deptlead", password: "Password@123" }` | 1. Gửi request POST `/api/v1/auth/login`<br>2. Kiểm tra status code & data trả về | - Trả về HTTP 201<br>- Trả về JWT Access Token & Refresh Token<br>- User Role trả về là `DEPT_LEAD` | **PASS** | `auth.e2e-spec.ts:73` |
| **TC-AUTH-04** | Đăng nhập thất bại với mật khẩu sai | `{ username: "employee", password: "WrongPassword@123" }` | 1. Gửi request POST `/api/v1/auth/login`<br>2. Kiểm tra lỗi trả về | - Trả về HTTP 401<br>- Mã lỗi trả về là `ERR_AUTH_001` | **PASS** | `auth.e2e-spec.ts:85` |
| **TC-AUTH-05** | Lấy thông tin cá nhân (Profile) với JWT hợp lệ | Header: `Authorization: Bearer <Admin Token>` | 1. Gửi request GET `/api/v1/auth/profile` kèm token hợp lệ | - Trả về HTTP 200<br>- Trả về thông tin chi tiết user (username = 'admin') | **PASS** | `auth.e2e-spec.ts:94` |
| **TC-AUTH-06** | Lấy thông tin cá nhân thất bại khi thiếu JWT | Không kèm Header Authorization | 1. Gửi request GET `/api/v1/auth/profile` không kèm token | - Trả về HTTP 401 Unauthorized | **PASS** | `auth.e2e-spec.ts:104` |
| **TC-AUTH-07** | Nhân viên tự đổi mật khẩu thành công | `{ oldPassword: "Password@123", newPassword: "NewPassword@123" }` | 1. Gửi POST `/api/v1/auth/change-password`<br>2. Login lại bằng mật khẩu mới để verify<br>3. Đổi lại về mật khẩu cũ để giữ trạng thái DB | - Trả về HTTP 201 Created<br>- Login bằng pass mới thành công (HTTP 201) | **PASS** | `auth.e2e-spec.ts:110` |
| **TC-AUTH-08** | Nhận Refresh Token khi đăng nhập thành công | `{ username: "employee", password: "Password@123" }` | 1. Gửi request POST `/api/v1/auth/login`<br>2. Kiểm tra `refreshToken` trong data trả về | - Trả về HTTP 201<br>- Phản hồi có chứa cả `accessToken` và `refreshToken` | **PASS** | `auth.e2e-spec.ts:149` |
| **TC-AUTH-09** | Tạo Access Token mới từ Refresh Token hợp lệ | `{ refreshToken: "<Valid Refresh Token>" }` | 1. Gửi request POST `/api/v1/auth/refresh` | - Trả về HTTP 201<br>- Trả về `accessToken` mới và `refreshToken` mới (sliding rotation) | **PASS** | `auth.e2e-spec.ts:162` |
| **TC-AUTH-10** | Đăng xuất hệ thống và vô hiệu hóa Refresh Token | Header: `Authorization: Bearer <Access Token>` | 1. Gửi request POST `/api/v1/auth/logout`<br>2. Thử gửi lại request refresh token cũ | - Request logout trả về HTTP 201<br>- Request refresh token cũ bị từ chối với HTTP 401 | **PASS** | `auth.e2e-spec.ts:178` |

---

### 2. Quy trình Duyệt Reset Mật khẩu (Password Reset Approval Workflow)

| TC ID | Kịch bản kiểm thử | Dữ liệu đầu vào | Các bước thực hiện | Kết quả mong đợi | Trạng thái | Mã nguồn Test |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-RESET-01** | Từ chối yêu cầu reset pass từ Trưởng phòng không thuộc phòng HR | `{ targetUserId: employeeUserId, newPassword: "ResetPassword@123" }` | 1. Cập nhật deptlead thuộc phòng ban BOD (không phải HR)<br>2. Gửi request reset password lên hệ thống | - Trả về HTTP 403 Forbidden<br>- Mã lỗi trả về là `ERR_AUTH_002` | **PASS** | `auth.e2e-spec.ts:203` |
| **TC-RESET-02** | Quy trình reset mật khẩu hoàn chỉnh (HR Lead yêu cầu -> Admin duyệt) | `{ targetUserId: employeeUserId, newPassword: "ResetPassword@123" }` | 1. Deptlead thuộc phòng ban HR gửi request reset mật khẩu nhân viên<br>2. Kiểm tra Approval Request được tạo dưới DB<br>3. Admin phê duyệt Approval Request này<br>4. Thử đăng nhập tài khoản nhân viên bằng mật khẩu mới | - Request khởi tạo trả về HTTP 201 kèm thông điệp chờ duyệt<br>- Approval Request ở trạng thái `PENDING` được tạo dưới DB<br>- Admin duyệt thành công (HTTP 201)<br>- Đăng nhập bằng mật khẩu mới thành công (HTTP 201) | **PASS** | `auth.e2e-spec.ts:223` |

---

### 3. Phân quyền Người dùng (Users Role Management)

| TC ID | Kịch bản kiểm thử | Dữ liệu đầu vào | Các bước thực hiện | Kết quả mong đợi | Trạng thái | Mã nguồn Test |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-ROLE-01** | Admin cập nhật vai trò (Role) của người dùng thành công | `{ role: UserRole.DIRECTOR }` | 1. Admin gửi PATCH `/api/v1/users/:id/role`<br>2. Verify role mới được lưu<br>3. Revert role về `EMPLOYEE` | - Trả về HTTP 200 OK<br>- Body trả về chứa role mới cập nhật là `DIRECTOR` | **PASS** | `auth.e2e-spec.ts:273` |
| **TC-ROLE-02** | Từ chối yêu cầu cập nhật vai trò gửi bởi Nhân viên | `{ role: UserRole.ADMIN }` | 1. Gửi request PATCH `/api/v1/users/:id/role` kèm token nhân viên | - Trả về HTTP 403 Forbidden | **PASS** | `auth.e2e-spec.ts:292` |

---

### 4. Phân hệ Cấu hình Tham số Hệ thống (Work Rate Configuration)

| TC ID | Kịch bản kiểm thử | Dữ liệu đầu vào | Các bước thực hiện | Kết quả mong đợi | Trạng thái | Mã nguồn Test |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-CONF-01** | Lấy danh sách cấu hình hệ số công (Work Rates) | Header: `Authorization: Bearer <Admin Token>` | 1. Gửi request GET `/api/v1/config/work-rates` | - Trả về HTTP 200 OK<br>- Danh sách trả về là một mảng có chứa các bản ghi cấu hình | **PASS** | `auth.e2e-spec.ts:301` |
| **TC-CONF-02** | Cập nhật giá trị cấu hình hệ số công thành công | `{ valueMultiplier: 15.00 }` | 1. Admin gửi PUT `/api/v1/config/work-rates/:key`<br>2. Kiểm tra giá trị mới cập nhật<br>3. Revert cấu hình về mặc định (12.00) | - Trả về HTTP 200 OK<br>- Giá trị `valueMultiplier` trả về là `15.00` | **PASS** | `auth.e2e-spec.ts:313` |

---

### 5. Kiểm thử Tích hợp Ứng dụng Cơ bản (App Module)

| TC ID | Kịch bản kiểm thử | Dữ liệu đầu vào | Các bước thực hiện | Kết quả mong đợi | Trạng thái | Mã nguồn Test |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-APP-01** | Kiểm tra ứng dụng khởi chạy bình thường (Health Check) | N/A | 1. Gửi request GET `/` | - Trả về HTTP 200 OK<br>- Nội dung phản hồi: "Hello World!" | **PASS** | `app.e2e-spec.ts` |
