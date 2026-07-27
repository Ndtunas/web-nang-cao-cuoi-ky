# Sơ đồ Cơ sở Dữ liệu HRM (Database Diagram - Report Edition)

Tài liệu này cung cấp **Sơ đồ Cơ sở Dữ liệu (ERD) rút gọn** theo **chiều dọc (Top-to-Bottom)** và **Bản tóm tắt phân hệ** để đưa trực tiếp vào báo cáo bài tập lớn/đồ án dạng trang A4 đứng.

---

## 📊 1. Sơ đồ Quan hệ Thực thể Chiều Dọc (Vertical ERD)

Sơ đồ sử dụng chỉ hướng `direction TB` (Top-to-Bottom) giúp bố cục các thực thể trải dọc, tránh bị tràn trang và hiển thị rõ ràng hơn trên báo cáo.

```mermaid
erDiagram
    direction TB

    %% Entities
    users {
        bigint id PK
        varchar username
        varchar role
    }

    employees {
        bigint id PK
        varchar emp_code
        varchar full_name
        bigint department_id FK
        bigint position_id FK
        bigint user_id FK
    }

    departments {
        bigint id PK
        varchar dept_code
        varchar name
        bigint manager_id FK
    }

    positions {
        bigint id PK
        varchar title
        numeric base_salary_ratio
    }

    projects {
        bigint id PK
        varchar project_code
        bigint pm_id FK
    }

    project_tasks {
        bigint id PK
        bigint project_id FK
    }

    timesheets {
        bigint id PK
        bigint employee_id FK
        bigint approval_request_id FK
    }

    timesheet_entries {
        bigint id PK
        bigint timesheet_id FK
        bigint project_id FK
        bigint task_id FK
    }

    leave_requests {
        bigint id PK
        bigint employee_id FK
        bigint approval_request_id FK
    }

    salaries {
        bigint id PK
        bigint employee_id FK
        bigint approval_request_id FK
    }

    approval_requests {
        bigint id PK
        bigint requester_id FK
    }

    approval_step_histories {
        bigint id PK
        bigint request_id FK
        bigint approver_id FK
    }

    system_audit_logs {
        bigint id PK
        bigint actor_id FK
    }

    notifications {
        bigint id PK
        bigint recipient_id FK
    }

    %% Relationships (Vertical flow)
    users ||--o| employees : "Liên kết tài khoản"
    users ||--o{ system_audit_logs : "Ghi vết thao tác"
    users ||--o{ notifications : "Nhận thông báo"
    
    departments ||--o{ employees : "Thuộc phòng ban"
    positions ||--o{ employees : "Giữ chức vụ"
    employees ||--o| departments : "Quản lý phòng ban"

    employees ||--o{ projects : "Làm PM"
    projects ||--|{ project_tasks : "Có các công việc"
    
    employees ||--o{ timesheets : "Khai báo công"
    timesheets ||--|{ timesheet_entries : "Chi tiết giờ công"
    projects ||--o{ timesheet_entries : "Khai báo cho dự án"
    project_tasks ||--o{ timesheet_entries : "Khai báo cho task"

    employees ||--o{ leave_requests : "Tạo đơn xin nghỉ"
    employees ||--o{ salaries : "Nhận bảng lương"
    
    employees ||--o{ approval_requests : "Gửi yêu cầu duyệt"
    approval_requests ||--o{ approval_step_histories : "Lịch sử các cấp duyệt"
    
    approval_requests ||--o| timesheets : "Liên kết duyệt công"
    approval_requests ||--o| leave_requests : "Liên kết duyệt nghỉ"
    approval_requests ||--o| salaries : "Liên kết duyệt lương"
```

---

## 📝 2. Tóm tắt 6 Nhóm Phân Hệ Cơ Sở Dữ Liệu

Hệ thống cơ sở dữ liệu gồm 21 bảng được tổ chức thành 6 phân hệ nghiệp vụ chính:

| STT | Phân hệ (Module) | Các bảng dữ liệu cốt lõi | Vai trò / Nghiệp vụ chính |
| :--- | :--- | :--- | :--- |
| **1** | **Tài khoản & Lưu vết** | `users`, `system_audit_logs`, `notifications` | Xác thực người dùng, phân quyền vai trò (Admin, Chairman, Director, Lead, Employee) và ghi vết thay đổi dữ liệu (Audit Trail). |
| **2** | **Cơ cấu Tổ chức** | `employees`, `departments`, `positions` | Quản lý thông tin hồ sơ nhân viên, sơ đồ phòng ban và hệ số lương theo chức vụ. |
| **3** | **Quản lý Công việc** | `projects`, `project_tasks` | Quản lý thông tin dự án, các hạng mục công việc và phân công PM. |
| **4** | **Khai báo Giờ công** | `timesheets`, `timesheet_entries`, `work_rate_configs` | Ghi nhận giờ công làm việc tiêu chuẩn và làm thêm giờ (OT) theo dự án/công việc; nạp động hệ số tính công. |
| **5** | **Luồng Phê duyệt** | `approval_configs`, `approval_requests`, `approval_step_histories` | Định nghĩa ma trận cấp duyệt động (từ 1 đến nhiều cấp) và lưu vết trạng thái phê duyệt yêu cầu. |
| **6** | **Chế độ & Lương** | `attendances`, `leave_requests`, `salaries`, `job_histories`, `salary_histories` | Chấm công hàng ngày, đơn xin nghỉ phép, quyết toán bảng lương hàng tháng và lưu vết biến động nhân sự/thu nhập. |

---

## 🛡️ 3. Ràng buộc Toàn vẹn Dữ liệu Chính

- **Khóa chính đồng nhất:** 100% sử dụng **Snowflake ID (`bigint`)** giúp hệ thống phân tán đạt hiệu năng tối đa và tự động sắp xếp theo thời gian khởi tạo.
- **Ràng buộc khóa ngoại an toàn:**
  - Sử dụng `ON DELETE RESTRICT` cho các liên kết phòng ban, chức vụ để tránh mất dữ liệu lịch sử nhân sự.
  - Sử dụng `ON DELETE CASCADE` cho các dữ liệu phụ thuộc trực tiếp (như chi tiết timesheet đi liền với timesheet).
  - Sử dụng `ON DELETE SET NULL` đối với người quản lý trực tiếp hoặc người thực hiện phê duyệt để giữ nguyên thông tin bản ghi gốc.
