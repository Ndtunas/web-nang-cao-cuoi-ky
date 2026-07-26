# 02. Chi Tiết Bảng CSDL, Snowflake ID, Khóa Ngoại & Chỉ Mục (Tables & Relationships Specification)

Tài liệu này mô tả chi tiết danh sách **21 Bảng CSDL**, sử dụng chuẩn **Snowflake ID (`BIGINT`)** cho 100% Khóa chính (`id`), quy tắc sinh Mã Nhân Viên `emp_code` theo thuật toán `Tên + Viết Tắt Họ/Lót + Num` (`BaoLM`, `BaoLM2`), các ràng buộc khóa ngoại (Foreign Keys) và chỉ mục (`INDEX`).

---

## 📊 1. Danh Sách 21 Bảng CSDL & Mối Quan Hệ Khóa Ngoại (Snowflake ID & Smart EmpCode Standard)

### 1. `users` (Tài khoản người dùng)
- **Columns:** `id` (BIGINT - Snowflake ID, PK), `username` (VARCHAR(50), UNIQUE - Đồng bộ với `emp_code` ví dụ `BaoLM`), `password_hash` (VARCHAR(255)), `role` (VARCHAR(20)), `status` (VARCHAR(20)), `created_at` (TIMESTAMP), `updated_at` (TIMESTAMP).
- **Constraints:** `CHECK (role IN ('ADMIN', 'CHAIRMAN', 'DIRECTOR', 'DEPT_LEAD', 'EMPLOYEE'))`.

### 2. `employees` (Hồ sơ nhân viên - Thực thể Trung tâm)
- **Columns:** `id` (BIGINT - Snowflake ID, PK), `emp_code` (VARCHAR(30), UNIQUE - Sinh tự động theo quy tắc `Tên + Viết tắt Họ/Lót + Num` ví dụ: `BaoLM`, `BaoLM2`), `full_name` (VARCHAR(100)), `email` (VARCHAR(100), UNIQUE), `phone` (VARCHAR(20)), `gender` (VARCHAR(10)), `dob` (DATE), `address` (TEXT), `tax_code` (VARCHAR(20)), `bank_name` (VARCHAR(50)), `bank_account` (VARCHAR(50)), `join_date` (DATE), `end_date` (DATE), `status` (VARCHAR(20)), `department_id` (BIGINT, FK -> `departments.id`), `position_id` (BIGINT, FK -> `positions.id`), `user_id` (BIGINT, FK -> `users.id`, UNIQUE), `created_at` (TIMESTAMP), `updated_at` (TIMESTAMP).
- **Constraints:** `CHECK (status IN ('ONBOARDING', 'PROBATION', 'OFFICIAL', 'SUSPENDED', 'NOTICE_PERIOD', 'TERMINATED'))`.

### 3. `system_audit_logs` (Nhật ký lưu vết giao dịch - Admin Check)
- **Columns:** `id` (BIGINT - Snowflake ID, PK), `timestamp` (TIMESTAMP), `actor_id` (BIGINT, FK -> `users.id`), `actor_role` (VARCHAR(20)), `action_type` (VARCHAR(20)), `entity_name` (VARCHAR(50)), `entity_id` (VARCHAR(100)), `old_data` (JSONB), `new_data` (JSONB), `ip_address` (VARCHAR(45)), `user_agent` (TEXT).
- **Indexes:** `idx_audit_actor (actor_id)`, `idx_audit_timestamp (timestamp)`, `idx_audit_entity (entity_name, entity_id)`.

### 4. `work_rate_configs` (Bảng cấu hình tham số & hệ số giờ công động)
- **Columns:** `id` (BIGINT - Snowflake ID, PK), `config_key` (VARCHAR(50), UNIQUE), `config_name` (VARCHAR(100)), `value_multiplier` (NUMERIC(5,2)), `effective_date` (DATE), `status` (VARCHAR(20)), `updated_by_id` (BIGINT, FK -> `users.id`), `created_at` (TIMESTAMP), `updated_at` (TIMESTAMP).

### 5. `departments` (Phòng ban)
- **Columns:** `id` (BIGINT - Snowflake ID, PK), `dept_code` (VARCHAR(20), UNIQUE), `name` (VARCHAR(100)), `description` (TEXT), `manager_id` (BIGINT, FK -> `employees.id`), `created_at` (TIMESTAMP), `updated_at` (TIMESTAMP).

### 6. `positions` (Chức vụ & Hệ số lương)
- **Columns:** `id` (BIGINT - Snowflake ID, PK), `title` (VARCHAR(100)), `base_salary_ratio` (NUMERIC(4,2)), `description` (TEXT), `created_at` (TIMESTAMP), `updated_at` (TIMESTAMP).

### 7. `projects` (Dự án)
- **Columns:** `id` (BIGINT - Snowflake ID, PK), `project_code` (VARCHAR(20), UNIQUE - Sinh `PRJ0001`), `name` (VARCHAR(150)), `start_date` (DATE), `end_date` (DATE), `pm_id` (BIGINT, FK -> `employees.id`), `status` (VARCHAR(20)), `created_at` (TIMESTAMP), `updated_at` (TIMESTAMP).

### 8. `project_tasks` (Công việc thuộc dự án)
- **Columns:** `id` (BIGINT - Snowflake ID, PK), `project_id` (BIGINT, FK -> `projects.id` ON DELETE CASCADE), `task_name` (VARCHAR(150)), `description` (TEXT), `estimated_hours` (NUMERIC(6,2)), `created_at` (TIMESTAMP), `updated_at` (TIMESTAMP).

### 9. `timesheets` (Bảng Timesheet tuần)
- **Columns:** `id` (BIGINT - Snowflake ID, PK), `timesheet_code` (VARCHAR(50), UNIQUE - Sinh `TS-2026-W29-BaoLM`), `employee_id` (BIGINT, FK -> `employees.id`), `week_number` (INT), `year` (INT), `start_date` (DATE), `end_date` (DATE), `total_normal_hours` (NUMERIC(5,2)), `total_ot_hours` (NUMERIC(5,2)), `status` (VARCHAR(20)), `approval_request_id` (BIGINT, FK -> `approval_requests.id`), `created_at` (TIMESTAMP), `updated_at` (TIMESTAMP).

### 10. `timesheet_entries` (Chi tiết dòng khai giờ công từng ngày)
- **Columns:** `id` (BIGINT - Snowflake ID, PK), `timesheet_id` (BIGINT, FK -> `timesheets.id` ON DELETE CASCADE), `project_id` (BIGINT, FK -> `projects.id`), `task_id` (BIGINT, FK -> `project_tasks.id`), `entry_date` (DATE), `hours_spent` (NUMERIC(4,2)), `work_type` (VARCHAR(20)), `applied_rate` (NUMERIC(4,2)), `description` (TEXT), `created_at` (TIMESTAMP), `updated_at` (TIMESTAMP).
- **Constraints:** `CHECK (hours_spent >= 0.5 AND hours_spent <= 24.0)`.

### 11. `approval_configs` (Cấu hình ma trận phê duyệt)
- **Columns:** `id` (BIGINT - Snowflake ID, PK), `transaction_type` (VARCHAR(50), UNIQUE), `required_levels` (INT), `approver_roles_sequence` (JSONB), `created_at` (TIMESTAMP), `updated_at` (TIMESTAMP).

### 12. `approval_requests` (Phiếu yêu cầu duyệt)
- **Columns:** `id` (BIGINT - Snowflake ID, PK), `request_code` (VARCHAR(50), UNIQUE - Sinh `REQ-20260721-00001`), `transaction_type` (VARCHAR(50)), `reference_entity_id` (VARCHAR(100)), `requester_id` (BIGINT, FK -> `employees.id`), `current_level` (INT), `total_levels` (INT), `status` (VARCHAR(20)), `created_at` (TIMESTAMP), `updated_at` (TIMESTAMP).

### 13. `approval_step_histories` (Lịch sử các cấp duyệt)
- **Columns:** `id` (BIGINT - Snowflake ID, PK), `request_id` (BIGINT, FK -> `approval_requests.id` ON DELETE CASCADE), `step_level` (INT), `approver_role` (VARCHAR(20)), `approver_id` (BIGINT, FK -> `employees.id`), `action` (VARCHAR(20)), `comment` (TEXT), `action_at` (TIMESTAMP).

### 14. `onboarding_tasks` (Checklist tiếp nhận nhân viên mới)
- **Columns:** `id` (BIGINT - Snowflake ID, PK), `employee_id` (BIGINT, FK -> `employees.id`), `task_title` (VARCHAR(150)), `target_department` (VARCHAR(20)), `assigned_by_id` (BIGINT, FK -> `employees.id`), `assignee_id` (BIGINT, FK -> `employees.id`), `due_date` (DATE), `status` (VARCHAR(20)), `completed_at` (TIMESTAMP), `created_at` (TIMESTAMP), `updated_at` (TIMESTAMP).

### 15. `offboarding_tasks` (Checklist bàn giao thôi việc)
- **Columns:** `id` (BIGINT - Snowflake ID, PK), `employee_id` (BIGINT, FK -> `employees.id`), `task_title` (VARCHAR(150)), `target_department` (VARCHAR(20)), `assigned_by_id` (BIGINT, FK -> `employees.id`), `assignee_id` (BIGINT, FK -> `employees.id`), `status` (VARCHAR(20)), `completed_at` (TIMESTAMP), `created_at` (TIMESTAMP), `updated_at` (TIMESTAMP).

### 16. `notifications` (Thông báo hệ thống & Ticket)
- **Columns:** `id` (BIGINT - Snowflake ID, PK), `recipient_id` (BIGINT, FK -> `users.id`), `title` (VARCHAR(150)), `message` (TEXT), `link_url` (VARCHAR(255)), `is_read` (BOOLEAN DEFAULT FALSE), `created_at` (TIMESTAMP).

### 17. `job_histories` (Lịch sử điều chuyển công tác Group B)
- **Columns:** `id` (BIGINT - Snowflake ID, PK), `decision_number` (VARCHAR(50), UNIQUE - Sinh `QĐ-DC/2026/0001`), `employee_id` (BIGINT, FK -> `employees.id`), `effective_date` (DATE), `old_department_id` (BIGINT, FK -> `departments.id`), `new_department_id` (BIGINT, FK -> `departments.id`), `old_position_id` (BIGINT, FK -> `positions.id`), `new_position_id` (BIGINT, FK -> `positions.id`), `approval_request_id` (BIGINT, FK -> `approval_requests.id`), `created_at` (TIMESTAMP).

### 18. `salary_histories` (Lịch sử biến động lương Group C)
- **Columns:** `id` (BIGINT - Snowflake ID, PK), `addendum_number` (VARCHAR(50), UNIQUE - Sinh `PLHĐ/2026/0001`), `employee_id` (BIGINT, FK -> `employees.id`), `effective_date` (DATE), `old_base_salary` (NUMERIC(12,2)), `new_base_salary` (NUMERIC(12,2)), `old_ratio` (NUMERIC(4,2)), `new_ratio` (NUMERIC(4,2)), `approval_request_id` (BIGINT, FK -> `approval_requests.id`), `created_at` (TIMESTAMP).

### 19. `attendances` (Chấm công hàng ngày)
- **Columns:** `id` (BIGINT - Snowflake ID, PK), `employee_id` (BIGINT, FK -> `employees.id`), `work_date` (DATE), `check_in` (TIME), `check_out` (TIME), `work_hours` (NUMERIC(4,2)), `status` (VARCHAR(20)), `created_at` (TIMESTAMP).
- **Constraints:** `UNIQUE(employee_id, work_date)`.

### 20. `leave_requests` (Đơn xin nghỉ phép 1 hoặc 2 cấp)
- **Columns:** `id` (BIGINT - Snowflake ID, PK), `employee_id` (BIGINT, FK -> `employees.id`), `leave_type` (VARCHAR(30)), `start_date` (DATE), `end_date` (DATE), `reason` (TEXT), `status` (VARCHAR(20)), `approval_request_id` (BIGINT, FK -> `approval_requests.id`), `created_at` (TIMESTAMP), `updated_at` (TIMESTAMP).

### 21. `salaries` (Bảng lương tháng)
- **Columns:** `id` (BIGINT - Snowflake ID, PK), `payroll_code` (VARCHAR(50), UNIQUE - Sinh `PR-202607-BaoLM`), `employee_id` (BIGINT, FK -> `employees.id`), `month` (INT), `year` (INT), `base_salary` (NUMERIC(12,2)), `work_days` (NUMERIC(4,2)), `ot_normal_hours` (NUMERIC(5,2)), `ot_weekend_hours` (NUMERIC(5,2)), `ot_holiday_hours` (NUMERIC(5,2)), `ot_pay_amount` (NUMERIC(12,2)), `allowance` (NUMERIC(12,2)), `deduction` (NUMERIC(12,2)), `net_salary` (NUMERIC(12,2)), `status` (VARCHAR(20)), `approval_request_id` (BIGINT, FK -> `approval_requests.id`), `created_at` (TIMESTAMP), `updated_at` (TIMESTAMP).
- **Constraints:** `UNIQUE(employee_id, month, year)`.
