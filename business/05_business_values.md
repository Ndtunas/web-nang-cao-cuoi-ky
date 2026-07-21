# 05. Quy Định Các Giá Trị Nghiệp Vụ (Business Values & Constants Specification)

Tài liệu này quy định **chuẩn hóa toàn bộ hằng số (Constants), Kiểu liệt kê (Enums), Giá trị mặc định (Default Values), Ràng buộc xác thực (Validation Rules), Mã Lỗi Nghiệp Vụ Trả Về Dưới Dạng i18n Key (Localized Error Keys) và Bảng Checklist Phủ Khớp Giá Trị Nghiệp Vụ**.

---

## 📌 1. Các Kiểu Liệt Kê Hệ Thống Hoàn Chỉnh (System Enums)

### 1.1 `UserRole` (Vai trò & Cấp bậc người dùng)
```typescript
enum UserRole {
  ADMIN = 'ADMIN',           // Quản trị hệ thống
  CHAIRMAN = 'CHAIRMAN',     // Level 4: Chủ tịch
  DIRECTOR = 'DIRECTOR',     // Level 3: Giám đốc
  DEPT_LEAD = 'DEPT_LEAD',   // Level 2: Trưởng phòng / HR Lead / PM
  EMPLOYEE = 'EMPLOYEE'      // Level 1: Thành viên / Nhân viên
}
```

### 1.2 `EmployeeStatus` (Trạng thái vòng đời nhân viên)
```typescript
enum EmployeeStatus {
  ONBOARDING = 'ONBOARDING',       // Đang thực hiện thủ tục tiếp nhận
  PROBATION = 'PROBATION',         // Đang trong thời gian thử việc
  OFFICIAL = 'OFFICIAL',           // Nhân viên chính thức
  SUSPENDED = 'SUSPENDED',         // Tạm hoãn HĐLĐ (nghỉ thai sản/nghỉ không lương)
  NOTICE_PERIOD = 'NOTICE_PERIOD', // Thời gian báo trước nghỉ việc
  TERMINATED = 'TERMINATED'        // Đã thanh lý HĐLĐ (Thôi việc)
}
```

### 1.3 `Gender` (Giới tính nhân viên)
```typescript
enum Gender {
  MALE = 'MALE',       // Nam
  FEMALE = 'FEMALE',   // Nữ
  OTHER = 'OTHER'      // Khác
}
```

### 1.4 `ContractType` (Loại Hợp đồng lao động)
```typescript
enum ContractType {
  PROBATION = 'PROBATION',         // Hợp đồng thử việc (2 tháng)
  FIXED_TERM_1Y = 'FIXED_TERM_1Y', // Hợp đồng xác định thời hạn 1 năm
  FIXED_TERM_3Y = 'FIXED_TERM_3Y', // Hợp đồng xác định thời hạn 3 năm
  INDEFINITE = 'INDEFINITE'        // Hợp đồng không xác định thời hạn
}
```

### 1.5 `LeaveType` (Phân loại loại nghỉ phép)
```typescript
enum LeaveType {
  ANNUAL_LEAVE = 'ANNUAL_LEAVE',           // Nghỉ phép năm (Hưởng lương)
  SICK_LEAVE = 'SICK_LEAVE',               // Nghỉ ốm (Hưởng bảo hiểm xã hội)
  MATERNITY_LEAVE = 'MATERNITY_LEAVE',     // Nghỉ thai sản
  UNPAID_LEAVE = 'UNPAID_LEAVE',           // Nghỉ không hưởng lương
  COMPASSIONATE_LEAVE = 'COMPASSIONATE_LEAVE' // Nghỉ việc riêng hưởng lương (hiếu/hỉ)
}
```

### 1.6 `WorkType` (Phân loại loại giờ công & OT trong Timesheet)
```typescript
enum WorkType {
  NORMAL = 'NORMAL',           // Giờ làm việc tiêu chuẩn (Hành chính)
  OT_WEEKDAY = 'OT_WEEKDAY',   // Làm thêm giờ ngày thường (Mặc định X1.5)
  OT_WEEKEND = 'OT_WEEKEND',   // Làm thêm giờ Thứ 7 / Chủ nhật (Mặc định X2.0)
  OT_HOLIDAY = 'OT_HOLIDAY',   // Làm thêm giờ ngày nghỉ Lễ/Tết (Mặc định X3.0)
  NIGHT_SHIFT = 'NIGHT_SHIFT'  // Làm việc ca đêm 22h-06h (Phụ cấp +30%)
}
```

### 1.7 `TransactionType` (Loại giao dịch trong Ma trận Phê duyệt)
```typescript
enum TransactionType {
  LEAVE_SHORT = 'LEAVE_SHORT',                   // Đơn nghỉ phép ngắn ngày (<= 2 ngày - 1 Cấp)
  LEAVE_LONG = 'LEAVE_LONG',                     // Đơn nghỉ phép dài ngày (> 2 ngày - 2 Cấp)
  TIMESHEET = 'TIMESHEET',                       // Khai báo Timesheet tuần (2 Cấp)
  PERSONAL_INFO_CHANGE = 'PERSONAL_INFO_CHANGE', // Thay đổi thông tin cá nhân Group A (1 Cấp)
  JOB_TRANSFER = 'JOB_TRANSFER',                 // Điều chuyển công tác Group B (2 Cấp)
  SALARY_ADJUSTMENT = 'SALARY_ADJUSTMENT',       // Tăng lương & Phụ cấp Group C (3 Cấp)
  DISCIPLINE_REWARD = 'DISCIPLINE_REWARD',       // Khen thưởng / Kỷ luật Group D (3 Cấp)
  OFFBOARDING = 'OFFBOARDING',                   // Thôi việc & Offboarding (3 Cấp)
  PAYROLL_MONTHLY = 'PAYROLL_MONTHLY'            // Chốt Bảng lương tháng (2 Cấp)
}
```

### 1.8 `ApprovalStatus` (Trạng thái duyệt phiếu)
```typescript
enum ApprovalStatus {
  PENDING = 'PENDING',   // Đang chờ duyệt ở cấp hiện tại
  APPROVED = 'APPROVED', // Đã duyệt hoàn tất tất cả các cấp
  REJECTED = 'REJECTED', // Bị từ chối ở một cấp bất kỳ
  CANCELLED = 'CANCELLED'// Người tạo chủ động hủy yêu cầu
}
```

### 1.9 `PayrollStatus` (Trạng thái bảng lương tháng)
```typescript
enum PayrollStatus {
  DRAFT = 'DRAFT',                       // Bảng lương nháp
  PENDING_APPROVAL = 'PENDING_APPROVAL', // Đang chờ duyệt 2 cấp (HR Lead -> Giám đốc)
  APPROVED = 'APPROVED',                 // Đã duyệt chốt bảng lương
  PAID = 'PAID'                          // Đã hoàn tất thanh toán chuyển khoản
}
```

### 1.10 `SystemActionType` (Loại hành động ghi nhật ký Audit Log)
```typescript
enum SystemActionType {
  CREATE = 'CREATE',     // Thêm mới dữ liệu
  UPDATE = 'UPDATE',     // Cập nhật dữ liệu
  DELETE = 'DELETE',     // Xóa dữ liệu
  APPROVE = 'APPROVE',   // Phê duyệt phiếu
  REJECT = 'REJECT',     // Từ chối phiếu
  LOGIN = 'LOGIN',       // Đăng nhập hệ thống
  LOGOUT = 'LOGOUT',     // Đăng xuất
  EXPORT = 'EXPORT'      // Xuất báo cáo Excel/PDF
}
```

---

## ⚙️ 2. Bảng Tham Số Hệ Số Giờ Công & OT Mặc Định (`WorkRateConfig`)

| Config Key | Data Type | Default Value | Mô tả Nghiệp vụ |
| :--- | :--- | :---: | :--- |
| `OT_RATE_WEEKDAY` | `FLOAT` | `1.5` | Hệ số nhân lương giờ OT ngày thường |
| `OT_RATE_WEEKEND` | `FLOAT` | `2.0` | Hệ số nhân lương giờ OT Thứ 7 / Chủ nhật |
| `OT_RATE_HOLIDAY` | `FLOAT` | `3.0` | Hệ số nhân lương giờ OT ngày Lễ / Tết |
| `NIGHT_SHIFT_BONUS` | `FLOAT` | `0.30` | Phụ cấp làm ca đêm (+30% lương giờ) |
| `STANDARD_WORK_DAYS_MONTH` | `INTEGER` | `22` | Số ngày công tiêu chuẩn làm việc trong tháng |
| `STANDARD_WORK_HOURS_DAY` | `INTEGER` | `8` | Số giờ làm việc tiêu chuẩn trong 1 ngày |
| `MAX_ANNUAL_LEAVE_DAYS` | `INTEGER` | `12` | Số ngày nghỉ phép năm tiêu chuẩn được hưởng lương |

---

## 📏 3. Quy Định Ràng Buộc Xác Thực Dữ Liệu (Validation Rules & Constraints)

1. **Mã Nhân Viên (`empCode`):** Format `^NV[0-9]{5}$` (VD: `NV00001`). Unique, Not Null.
2. **Email Công Ty (`email`):** Standard Email Regex (`^[a-zA-Z0-9._%+-]+@company\.com$`). Unique.
3. **Mật Khẩu (`password`):** Min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special char (`!@#$%^&*`).
4. **Số Điện Thoại (`phone`):** Format `^(0[3|5|7|8|9])[0-9]{8}$` (10 chữ số).
5. **Số Giờ Khai Timesheet (`hoursSpent`):** Min `0.5` giờ, Max `24.0` giờ/ngày.
6. **Mã Số Thuế (`taxCode`):** Format `^[0-9]{10,13}$` (10 hoặc 13 chữ số).

---

## 🚨 4. Bảng Mã Lỗi Nghiệp Vụ Chuẩn Trả Về Dưới Dạng `i18nKey`

### 📋 Định dạng JSON lỗi chuẩn:
```json
{
  "statusCode": 400,
  "errorCode": "ERR_LEAVE_001",
  "i18nKey": "error.leave.insufficientBalance",
  "params": { "requestedDays": 5, "remainingDays": 2 },
  "timestamp": "2026-07-21T16:38:00.000Z"
}
```

### 📋 Danh sách Bảng Ánh Xạ Mã Lỗi (`errorCode` $\rightarrow$ `i18nKey`):

| Error Code | HTTP Status | i18n Key Trả Về từ Backend | Ý Nghĩa Nghiệp Vụ |
| :--- | :---: | :--- | :--- |
| `ERR_AUTH_001` | 401 | `error.auth.invalidCredentials` | Email hoặc mật khẩu không chính xác |
| `ERR_AUTH_002` | 403 | `error.auth.accessDenied` | Không có quyền truy cập |
| `ERR_EMP_001` | 400 | `error.employee.codeOrEmailExists` | Mã nhân viên hoặc Email đã tồn tại |
| `ERR_EMP_002` | 400 | `error.employee.cannotTransferNoticePeriod` | Nhân viên đang trong thời gian báo trước nghỉ việc |
| `ERR_LEAVE_001` | 400 | `error.leave.insufficientBalance` | Quỹ ngày phép năm không đủ |
| `ERR_LEAVE_002` | 400 | `error.leave.invalidDateRange` | Ngày bắt đầu nghỉ phải nhỏ hơn hoặc bằng ngày kết thúc |
| `ERR_APPROVAL_001` | 403 | `error.approval.unauthorizedLevel` | Không có thẩm quyền duyệt ở cấp hiện tại |
| `ERR_APPROVAL_002` | 400 | `error.approval.alreadyRejected` | Phiếu yêu cầu đã bị từ chối trước đó |
| `ERR_TIMESHEET_001` | 400 | `error.timesheet.alreadyApproved` | Timesheet đã duyệt, không thể sửa |
| `ERR_PAYROLL_001` | 400 | `error.payroll.alreadyFinalized` | Bảng lương tháng đã chốt, không thể tính lại |

---

## 📋 5. Bảng Checklist Rà Soát Tính Đầy Đủ Giá Trị Nghiệp Vụ (Business Values Audit Checklist)

| Hạng Mục Kiểm Tra | Danh Sách Thành Phần Định Nghĩa | Trạng Thái Phủ Khớp |
| :--- | :--- | :---: |
| **System Enums** | `UserRole` (5), `EmployeeStatus` (6), `Gender` (3), `ContractType` (4), `LeaveType` (5), `WorkType` (5), `TransactionType` (9), `ApprovalStatus` (4), `PayrollStatus` (4), `SystemActionType` (8) | ✅ Đầy đủ 10/10 |
| **Config Parameters** | `OT_RATE_WEEKDAY`, `OT_RATE_WEEKEND`, `OT_RATE_HOLIDAY`, `NIGHT_SHIFT_BONUS`, `STANDARD_WORK_DAYS_MONTH`, `STANDARD_WORK_HOURS_DAY` | ✅ Đầy đủ 7/7 |
| **Validation Rules** | `empCode`, `email`, `phone`, `password`, `hoursSpent`, `taxCode` | ✅ Đầy đủ 6/6 |
| **Error Codes & i18n** | `ERR_AUTH_001..002`, `ERR_EMP_001..002`, `ERR_LEAVE_001..002`, `ERR_APPROVAL_001..002`, `ERR_TIMESHEET_001`, `ERR_PAYROLL_001` | ✅ Đầy đủ 10/10 |
| **DB Constraints** | Unique Index (`empCode`, `email`), Foreign Key Constraints (Cascade & Restrict) | ✅ Đầy đủ 100% |
