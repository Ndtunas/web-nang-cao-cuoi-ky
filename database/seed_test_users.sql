-- ====================================================================
-- SEED DATA ĐẦY ĐỦ CHO TEST ONBOARDING
-- Tạo users cho tất cả phòng ban: IT, HR, ADMIN
-- ====================================================================

-- Tạo thêm positions nếu chưa có
INSERT INTO positions (title, base_salary_ratio, description) 
VALUES ('HR_MANAGER', 2.00, 'Quản lý Nhân sự')
ON CONFLICT DO NOTHING;

INSERT INTO positions (title, base_salary_ratio, description) 
VALUES ('IT_SUPPORT', 1.10, 'Nhân viên Hỗ trợ IT')
ON CONFLICT DO NOTHING;

-- Tạo thêm departments nếu chưa có  
INSERT INTO departments (dept_code, name, description) 
VALUES ('IT', 'Phòng Công nghệ thông tin', 'Phòng phát triển phần mềm và vận hành hệ thống')
ON CONFLICT (dept_code) DO NOTHING;

INSERT INTO departments (dept_code, name, description) 
VALUES ('HR', 'Phòng Nhân sự', 'Phòng hành chính và quản lý tài nguyên nhân sự')
ON CONFLICT (dept_code) DO NOTHING;

INSERT INTO departments (dept_code, name, description) 
VALUES ('ADMIN', 'Phòng Hành chính', 'Phòng quản trị và hành chính')
ON CONFLICT (dept_code) DO NOTHING;

-- ====================================================================
-- TẠO USERS VÀ EMPLOYEES CHO HR DEPARTMENT
-- ====================================================================

-- HR Manager - Quản lý phòng HR
INSERT INTO users (username, password_hash, role, status)
VALUES ('hr_manager', '$2b$10$8K1p/a0dL/XVC/Ch.zOvauHLk7W6aM2E.rWBGYQ6sJCGmVJbqHGe', 'DEPT_LEAD', 'ACTIVE')
ON CONFLICT (username) DO NOTHING;

-- HR Staff - Nhân viên HR
INSERT INTO users (username, password_hash, role, status)
VALUES ('hr_staff', '$2b$10$xK2q/b1eM/YWD/Di.aPw bvIMx8bN3F.sXCHZYs7rKDhNWKcqIIf', 'EMPLOYEE', 'ACTIVE')
ON CONFLICT (username) DO NOTHING;

-- ====================================================================
-- TẠO USERS CHO ADMIN DEPARTMENT  
-- ====================================================================

-- Admin Staff - Nhân viên Admin
INSERT INTO users (username, password_hash, role, status)
VALUES ('admin_staff', '$2b$10$yL3r/c2fN/ZEX/En.bQx cwJNMy9cO4.tYDI[As8sLEhOXLdrJKKg', 'EMPLOYEE', 'ACTIVE')
ON CONFLICT (username) DO NOTHING;

-- ====================================================================
-- TẠO EMPLOYEES CHO HR DEPARTMENT
-- ====================================================================

-- Lấy IDs
DO $$
DECLARE
  v_dept_hr_id BIGINT;
  v_pos_hr_manager_id BIGINT;
  v_pos_hr_staff_id BIGINT;
  v_user_hr_manager_id BIGINT;
  v_user_hr_staff_id BIGINT;
  v_emp_hr_manager_id BIGINT;
  v_emp_hr_staff_id BIGINT;
  v_dept_admin_id BIGINT;
  v_pos_admin_staff_id BIGINT;
  v_user_admin_staff_id BIGINT;
  v_emp_admin_staff_id BIGINT;
BEGIN
  -- Lấy department IDs
  SELECT id INTO v_dept_hr_id FROM departments WHERE dept_code = 'HR';
  SELECT id INTO v_dept_admin_id FROM departments WHERE dept_code = 'ADMIN';
  
  -- Lấy position IDs
  SELECT id INTO v_pos_hr_manager_id FROM positions WHERE title = 'HR_MANAGER';
  SELECT id INTO v_pos_hr_staff_id FROM positions WHERE title = 'HR_STAFF';
  SELECT id INTO v_pos_admin_staff_id FROM positions WHERE title = 'ADMIN_STAFF';
  
  -- Lấy user IDs
  SELECT id INTO v_user_hr_manager_id FROM users WHERE username = 'hr_manager';
  SELECT id INTO v_user_hr_staff_id FROM users WHERE username = 'hr_staff';
  SELECT id INTO v_user_admin_staff_id FROM users WHERE username = 'admin_staff';
  
  -- Tạo HR Manager Employee
  INSERT INTO employees (full_name, email, phone, gender, dob, address, status, department_id, position_id, user_id)
  VALUES ('Phạm Thị Hương HR', 'hr_manager@company.com', '0901234567', 'FEMALE', '1985-03-20', '100 Hoàng Hoa Thám, Hà Nội', 'OFFICIAL', v_dept_hr_id, v_pos_hr_manager_id, v_user_hr_manager_id)
  ON CONFLICT (email) DO NOTHING
  RETURNING id INTO v_emp_hr_manager_id;

  -- Tạo HR Staff Employee
  INSERT INTO employees (full_name, email, phone, gender, dob, address, status, department_id, position_id, user_id)
  VALUES ('Đặng Minh Tuấn HR', 'hr_staff@company.com', '0901234568', 'MALE', '1992-07-15', '101 Hoàng Hoa Thám, Hà Nội', 'OFFICIAL', v_dept_hr_id, v_pos_hr_staff_id, v_user_hr_staff_id)
  ON CONFLICT (email) DO NOTHING
  RETURNING id INTO v_emp_hr_staff_id;

  -- Tạo Admin Staff Employee
  INSERT INTO employees (full_name, email, phone, gender, dob, address, status, department_id, position_id, user_id)
  VALUES ('Lê Văn An Admin', 'admin_staff@company.com', '0901234569', 'MALE', '1990-11-25', '102 Hoàng Hoa Thám, Hà Nội', 'OFFICIAL', v_dept_admin_id, v_pos_admin_staff_id, v_user_admin_staff_id)
  ON CONFLICT (email) DO NOTHING
  RETURNING id INTO v_emp_admin_staff_id;
  
  -- Update HR department manager
  IF v_emp_hr_manager_id IS NOT NULL THEN
    UPDATE departments SET manager_id = v_emp_hr_manager_id WHERE dept_code = 'HR';
  END IF;
  
  RAISE NOTICE 'Seed HR and Admin users completed!';
END $$;

-- ====================================================================
-- RESET PASSWORD HASHES (format: empCode + Password@ + dob)
-- ====================================================================
-- hr_manager: empCode (từ trigger) + Password@123 + 1985-03-20
-- hr_staff: empCode + Password@123 + 1992-07-15  
-- admin_staff: empCode + Password@123 + 1990-11-25
-- 
-- NOTE: Vì empCode được sinh tự động bởi trigger, ta cần tạo temp hash
-- và update sau khi có empCode
-- ====================================================================
