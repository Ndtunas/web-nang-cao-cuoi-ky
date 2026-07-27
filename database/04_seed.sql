-- ====================================================================
-- SYSTEM HRM DATA SEEDER SCRIPT
-- Target RDBMS: PostgreSQL 14+
-- Seeds: 1. System Configs, 2. Approval Configs, 3. Positions,
--        4. Departments, 5. Users & Employees, 6. Projects & Tasks
-- ====================================================================

-- 1. Seed Approval Configs (Ma trận phê duyệt)
TRUNCATE TABLE approval_configs CASCADE;
INSERT INTO approval_configs (transaction_type, required_levels, approver_roles_sequence) VALUES
('LEAVE_SHORT', 1, '["DEPT_LEAD"]'::jsonb),
('LEAVE_LONG', 2, '["DEPT_LEAD", "DIRECTOR"]'::jsonb),
('TIMESHEET', 2, '["DEPT_LEAD", "DIRECTOR"]'::jsonb),
('PERSONAL_INFO_CHANGE', 1, '["ADMIN"]'::jsonb),
('JOB_TRANSFER', 2, '["DEPT_LEAD", "DIRECTOR"]'::jsonb),
('SALARY_ADJUSTMENT', 3, '["DEPT_LEAD", "DIRECTOR", "CHAIRMAN"]'::jsonb),
('DISCIPLINE_REWARD', 3, '["DEPT_LEAD", "DIRECTOR", "CHAIRMAN"]'::jsonb),
('OFFBOARDING', 3, '["DEPT_LEAD", "DIRECTOR", "CHAIRMAN"]'::jsonb),
('PAYROLL_MONTHLY', 2, '["DEPT_LEAD", "DIRECTOR"]'::jsonb),
('RESET_PASSWORD', 1, '["ADMIN"]'::jsonb);

-- 2. Seed Positions, Departments, Users, Employees, Projects & Tasks (PL/pgSQL Block)
DO $$
DECLARE
  v_pos_director_id BIGINT;
  v_pos_lead_id BIGINT;
  v_pos_dev_id BIGINT;
  v_pos_hr_id BIGINT;
  
  v_dept_bod_id BIGINT;
  v_dept_it_id BIGINT;
  v_dept_hr_id BIGINT;
  
  v_user_admin_id BIGINT;
  v_user_director_id BIGINT;
  v_user_lead_id BIGINT;
  v_user_emp_id BIGINT;
  
  v_emp_director_id BIGINT;
  v_emp_lead_id BIGINT;
  v_emp_dev_id BIGINT;
  
  v_project_id BIGINT;
BEGIN
  -- Clear existing data
  TRUNCATE TABLE project_tasks CASCADE;
  TRUNCATE TABLE projects CASCADE;
  TRUNCATE TABLE employees CASCADE;
  TRUNCATE TABLE departments CASCADE;
  TRUNCATE TABLE positions CASCADE;
  TRUNCATE TABLE users CASCADE;

  -- 3.1 Insert Positions
  INSERT INTO positions (title, base_salary_ratio, description) 
  VALUES ('DIRECTOR', 3.00, 'Giám đốc Điều hành') RETURNING id INTO v_pos_director_id;
  
  INSERT INTO positions (title, base_salary_ratio, description) 
  VALUES ('DEPT_LEAD', 2.00, 'Trưởng phòng / Quản lý bộ phận') RETURNING id INTO v_pos_lead_id;
  
  INSERT INTO positions (title, base_salary_ratio, description) 
  VALUES ('DEVELOPER', 1.20, 'Lập trình viên / Kỹ sư phần mềm') RETURNING id INTO v_pos_dev_id;
  
  INSERT INTO positions (title, base_salary_ratio, description) 
  VALUES ('HR_STAFF', 1.00, 'Nhân viên Hành chính Nhân sự') RETURNING id INTO v_pos_hr_id;

  -- 3.2 Insert Departments (manager_id để trống trước, cập nhật sau)
  INSERT INTO departments (dept_code, name, description) 
  VALUES ('BOD', 'Ban Giám đốc', 'Ban điều hành cao nhất của công ty') RETURNING id INTO v_dept_bod_id;
  
  INSERT INTO departments (dept_code, name, description) 
  VALUES ('IT', 'Phòng Công nghệ thông tin', 'Phòng phát triển phần mềm và vận hành hệ thống') RETURNING id INTO v_dept_it_id;
  
  INSERT INTO departments (dept_code, name, description) 
  VALUES ('HR', 'Phòng Nhân sự', 'Phòng hành chính và quản lý tài nguyên nhân sự') RETURNING id INTO v_dept_hr_id;

-- 3.3 Insert Users (Bcrypt hashes theo cơ chế đơn giản: hash trực tiếp từ password thuần)
-- Format: password_hash = bcrypt(password)
--   admin    : "Admin@123"
--   director : "Password@123"
--   deptlead : "Password@123"
--   employee : "Password@123"
-- Nếu muốn regenerate, chạy: cd backend && node scripts/hash-seed.mjs
INSERT INTO users (username, password_hash, role, status)
VALUES ('admin', '$2b$10$zDctzQH4.5HwGTjAggP9YeIQSJRPB6WL8pEVJG05g1jcAS90VsXC6', 'ADMIN', 'ACTIVE')
RETURNING id INTO v_user_admin_id;

INSERT INTO users (username, password_hash, role, status)
VALUES ('director', '$2b$10$n2Is1gvjBM9GFxZf8BTjd.dxsYsItFkjzadmq23A7FMzMDho3Qjqq', 'DIRECTOR', 'ACTIVE')
RETURNING id INTO v_user_director_id;

INSERT INTO users (username, password_hash, role, status)
VALUES ('deptlead', '$2b$10$uuvthcM55ROt0W2HVptig.PxS3f1OmRkDvzOfgcyYJNdzNnclJXHq', 'DEPT_LEAD', 'ACTIVE')
RETURNING id INTO v_user_lead_id;

INSERT INTO users (username, password_hash, role, status)
VALUES ('employee', '$2b$10$9w69b67QNSFmLrG0H8Zw9OjcTv03iQqe8CMg0wM2ZaXCR4yZNpru6', 'EMPLOYEE', 'ACTIVE')
RETURNING id INTO v_user_emp_id;

  -- 3.4 Insert Employees (Trigger tự động sinh emp_code theo full_name)
  INSERT INTO employees (full_name, email, phone, gender, dob, address, status, department_id, position_id, user_id)
  VALUES ('Lê Minh Giám Đốc', 'director@company.com', '0987654321', 'MALE', '1980-05-15', '123 Đường Láng, Hà Nội', 'OFFICIAL', v_dept_bod_id, v_pos_director_id, v_user_director_id)
  RETURNING id INTO v_emp_director_id;

  INSERT INTO employees (full_name, email, phone, gender, dob, address, status, department_id, position_id, user_id)
  VALUES ('Nguyễn Văn Trưởng Phòng', 'deptlead@company.com', '0912345678', 'MALE', '1988-08-20', '456 Cầu Giấy, Hà Nội', 'OFFICIAL', v_dept_it_id, v_pos_lead_id, v_user_lead_id)
  RETURNING id INTO v_emp_lead_id;

  INSERT INTO employees (full_name, email, phone, gender, dob, address, status, department_id, position_id, user_id)
  VALUES ('Trần Thị Nhân Viên', 'employee@company.com', '0955566677', 'FEMALE', '1995-11-30', '789 Thanh Xuân, Hà Nội', 'OFFICIAL', v_dept_it_id, v_pos_dev_id, v_user_emp_id)
  RETURNING id INTO v_emp_dev_id;

  -- 3.5 Update Departments' manager_id
  UPDATE departments SET manager_id = v_emp_director_id WHERE id = v_dept_bod_id;
  UPDATE departments SET manager_id = v_emp_lead_id WHERE id = v_dept_it_id;

  -- 3.6 Insert Projects
  INSERT INTO projects (project_code, name, start_date, pm_id, status)
  VALUES ('PRJ0001', 'Hệ thống HRM Core', '2026-01-01', v_emp_lead_id, 'ACTIVE')
  RETURNING id INTO v_project_id;

  -- 3.7 Insert Project Tasks
  INSERT INTO project_tasks (project_id, task_name, description, estimated_hours) VALUES
  (v_project_id, 'Phân tích thiết kế hệ thống', 'Phân tích User Stories, Database Schema', 40.00),
  (v_project_id, 'Phát triển Backend NestJS', 'Xây dựng core framework và 8 module chính', 120.00),
  (v_project_id, 'Phát triển Frontend React', 'Xây dựng layout và tích hợp API', 80.00);

END $$;

-- 3. Seed Work Rate Configs (Bảng tham số hệ số giờ công & OT) - Seed at the very end to avoid cascade deletion
TRUNCATE TABLE work_rate_configs CASCADE;
INSERT INTO work_rate_configs (config_key, config_name, value_multiplier, status) VALUES
('OT_RATE_WEEKDAY', 'Hệ số OT ngày thường', 1.50, 'ACTIVE'),
('OT_RATE_WEEKEND', 'Hệ số OT cuối tuần (T7/CN)', 2.00, 'ACTIVE'),
('OT_RATE_HOLIDAY', 'Hệ số OT ngày lễ/tết', 3.00, 'ACTIVE'),
('NIGHT_SHIFT_BONUS', 'Hệ số phụ cấp làm ca đêm', 0.30, 'ACTIVE'),
('STANDARD_WORK_DAYS_MONTH', 'Số ngày công tiêu chuẩn trong tháng', 22.00, 'ACTIVE'),
('STANDARD_WORK_HOURS_DAY', 'Số giờ làm việc tiêu chuẩn trong ngày', 8.00, 'ACTIVE'),
('MAX_ANNUAL_LEAVE_DAYS', 'Số ngày nghỉ phép năm tối đa', 12.00, 'ACTIVE');

-- ====================================================================
-- 4. FIX PASSWORD HASHES (Idempotent - chạy an toàn nhiều lần)
-- Cơ chế đơn giản: hash trực tiếp từ password thuần.
--   admin:    "12345678"
--   director: "12345678"
--   deptlead: "12345678"
--   employee: "12345678"
-- Tất cả 4 user dùng cùng hash (hash của "12345678").
-- Nếu muốn generate lại hash mới, chạy: cd backend && node scripts/hash-seed.mjs
-- ====================================================================
UPDATE users SET password_hash = '$2b$10$3RPOZCMxowfoicfjmziO0.VoGRuKMsi0NU0hKnCgBnnC3bwHdMJkO' WHERE username IN ('admin', 'director', 'deptlead', 'employee');
