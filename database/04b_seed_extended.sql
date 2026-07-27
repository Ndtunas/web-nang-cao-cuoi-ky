-- ====================================================================
-- EXTENDED TEST USERS SEEDER (file mở rộng từ 04_seed.sql)
-- Mục đích: Tạo thêm user cho TỪNG phòng ban để test phê duyệt + onboarding
-- Idempotent: chạy nhiều lần an toàn (dùng ON CONFLICT / WHERE EXISTS).
--
-- Password mặc định cho MỌI user: "12345678"
-- Hash bcrypt(10) của "12345678": $2b$10$3RPOZCMxowfoicfjmziO0.VoGRuKMsi0NU0hKnCgBnnC3bwHdMJkO
--
-- Bộ user:
--   BOD     : bod_lead, bod_staff1, bod_staff2
--   IT      : it_lead, it_dev1, it_dev2
--   HR      : hr_lead, hr_staff1, hr_staff2
--   ADMIN   : admin_lead, admin_staff1, admin_staff2
--   FINANCE : fin_lead, fin_acct1, fin_acct2
--   SALES   : sales_lead, sales_exec1, sales_exec2
--   MKT     : mkt_lead, mkt_exec1, mkt_exec2
--
-- Vai trò:
--   <dept>_lead     : DEPT_LEAD  (phê duyệt cấp 1)
--   <dept>_staff1/2 : EMPLOYEE
--
-- Lệnh chạy:
--   psql -h <host> -p <port> -U <user> -d <db> -v ON_ERROR_STOP=1 -f database/04b_seed_extended.sql
-- ====================================================================

BEGIN;

-- 1. Seed thêm Positions (idempotent qua UNIQUE(title))
INSERT INTO positions (title, base_salary_ratio, description)
VALUES
  ('HR_MANAGER', 2.20, 'Trưởng phòng Nhân sự'),
  ('HR_STAFF',   1.00, 'Nhân viên Hành chính Nhân sự'),
  ('ADMIN_STAFF', 1.00, 'Nhân viên Hành chính'),
  ('ACCOUNTANT', 1.30, 'Kế toán viên'),
  ('FINANCE_STAFF', 1.00, 'Nhân viên Tài chính'),
  ('SALES_EXEC', 1.15, 'Nhân viên Kinh doanh'),
  ('MKT_EXEC',   1.15, 'Nhân viên Marketing')
ON CONFLICT (title) DO NOTHING;

-- 2. Seed thêm Departments (idempotent qua UNIQUE(dept_code))
INSERT INTO departments (dept_code, name, description)
VALUES
  ('FIN', 'Phòng Tài chính - Kế toán', 'Phòng quản lý tài chính và kế toán'),
  ('SALES', 'Phòng Kinh doanh', 'Phòng bán hàng và chăm sóc khách hàng'),
  ('MKT', 'Phòng Marketing', 'Phòng truyền thông và quảng bá thương hiệu')
ON CONFLICT (dept_code) DO NOTHING;

-- 3. Insert Users + Employees cho từng phòng ban
DO $$
DECLARE
  v_hash TEXT := '$2b$10$3RPOZCMxowfoicfjmziO0.VoGRuKMsi0NU0hKnCgBnnC3bwHdMJkO';

  v_pos_hr_manager_id   BIGINT;
  v_pos_hr_staff_id     BIGINT;
  v_pos_admin_staff_id  BIGINT;
  v_pos_accountant_id   BIGINT;
  v_pos_finance_staff_id BIGINT;
  v_pos_sales_exec_id   BIGINT;
  v_pos_mkt_exec_id     BIGINT;

  v_dept_admin_id  BIGINT;
  v_dept_hr_id     BIGINT;
  v_dept_fin_id    BIGINT;
  v_dept_sales_id  BIGINT;
  v_dept_mkt_id    BIGINT;

  v_user_id BIGINT;
  v_emp_id  BIGINT;
BEGIN
  -- Lấy id các position
  SELECT id INTO v_pos_hr_manager_id    FROM positions WHERE title = 'HR_MANAGER';
  SELECT id INTO v_pos_hr_staff_id      FROM positions WHERE title = 'HR_STAFF';
  SELECT id INTO v_pos_admin_staff_id   FROM positions WHERE title = 'ADMIN_STAFF';
  SELECT id INTO v_pos_accountant_id    FROM positions WHERE title = 'ACCOUNTANT';
  SELECT id INTO v_pos_finance_staff_id FROM positions WHERE title = 'FINANCE_STAFF';
  SELECT id INTO v_pos_sales_exec_id    FROM positions WHERE title = 'SALES_EXEC';
  SELECT id INTO v_pos_mkt_exec_id      FROM positions WHERE title = 'MKT_EXEC';

  -- Lấy id các dept mới (BOD/IT đã có sẵn trong 04_seed.sql)
  SELECT id INTO v_dept_admin_id FROM departments WHERE dept_code = 'ADMIN';
  SELECT id INTO v_dept_hr_id    FROM departments WHERE dept_code = 'HR';
  SELECT id INTO v_dept_fin_id   FROM departments WHERE dept_code = 'FIN';
  SELECT id INTO v_dept_sales_id FROM departments WHERE dept_code = 'SALES';
  SELECT id INTO v_dept_mkt_id   FROM departments WHERE dept_code = 'MKT';

  ----------------------------------------------------------------------
  -- BOD (Ban Giám đốc) - không có dept mới, dùng dept BOD sẵn có
  ----------------------------------------------------------------------
  -- bod_lead
  IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'bod_lead') THEN
    INSERT INTO users (username, password_hash, role, status)
      VALUES ('bod_lead', v_hash, 'DEPT_LEAD', 'ACTIVE')
      RETURNING id INTO v_user_id;
    INSERT INTO employees (full_name, email, phone, gender, dob, address, status,
                           department_id, position_id, user_id)
      SELECT 'Bùi Văn BOD Lead',
             'bod_lead@company.com', '0900000001', 'MALE', '1975-01-10',
             'Hà Nội', 'OFFICIAL', d.id, p.id, v_user_id
      FROM departments d, positions p
      WHERE d.dept_code = 'BOD' AND p.title = 'DEPT_LEAD';
  END IF;

  ----------------------------------------------------------------------
  -- IT (đã có deptlead/employee từ 04_seed.sql - bổ sung thêm để đủ 1 lead + 2 staff)
  ----------------------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'it_lead') THEN
    INSERT INTO users (username, password_hash, role, status)
      VALUES ('it_lead', v_hash, 'DEPT_LEAD', 'ACTIVE')
      RETURNING id INTO v_user_id;
    INSERT INTO employees (full_name, email, phone, gender, dob, address, status,
                           department_id, position_id, user_id)
      SELECT 'Nguyễn Văn IT Lead',
             'it_lead@company.com', '0900000010', 'MALE', '1988-03-15',
             'Hà Nội', 'OFFICIAL', d.id, p.id, v_user_id
      FROM departments d, positions p
      WHERE d.dept_code = 'IT' AND p.title = 'DEPT_LEAD'
      RETURNING id INTO v_emp_id;
    UPDATE departments SET manager_id = v_emp_id WHERE dept_code = 'IT';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'it_dev1') THEN
    INSERT INTO users (username, password_hash, role, status)
      VALUES ('it_dev1', v_hash, 'EMPLOYEE', 'ACTIVE')
      RETURNING id INTO v_user_id;
    INSERT INTO employees (full_name, email, phone, gender, dob, address, status,
                           department_id, position_id, user_id)
      SELECT 'Lê Văn IT Dev1',
             'it_dev1@company.com', '0900000011', 'MALE', '1995-05-20',
             'Hà Nội', 'OFFICIAL', d.id, p.id, v_user_id
      FROM departments d, positions p
      WHERE d.dept_code = 'IT' AND p.title = 'DEVELOPER';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'it_dev2') THEN
    INSERT INTO users (username, password_hash, role, status)
      VALUES ('it_dev2', v_hash, 'EMPLOYEE', 'ACTIVE')
      RETURNING id INTO v_user_id;
    INSERT INTO employees (full_name, email, phone, gender, dob, address, status,
                           department_id, position_id, user_id)
      SELECT 'Phạm Thị IT Dev2',
             'it_dev2@company.com', '0900000012', 'FEMALE', '1996-08-12',
             'Hà Nội', 'OFFICIAL', d.id, p.id, v_user_id
      FROM departments d, positions p
      WHERE d.dept_code = 'IT' AND p.title = 'DEVELOPER';
  END IF;

  ----------------------------------------------------------------------
  -- HR
  ----------------------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'hr_lead') THEN
    INSERT INTO users (username, password_hash, role, status)
      VALUES ('hr_lead', v_hash, 'DEPT_LEAD', 'ACTIVE')
      RETURNING id INTO v_user_id;
    INSERT INTO employees (full_name, email, phone, gender, dob, address, status,
                           department_id, position_id, user_id)
      SELECT 'Trần Thị HR Manager',
             'hr_lead@company.com', '0900000020', 'FEMALE', '1985-07-22',
             'Hà Nội', 'OFFICIAL', d.id, p.id, v_user_id
      FROM departments d, positions p
      WHERE d.dept_code = 'HR' AND p.title = 'HR_MANAGER'
      RETURNING id INTO v_emp_id;
    UPDATE departments SET manager_id = v_emp_id WHERE dept_code = 'HR';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'hr_staff1') THEN
    INSERT INTO users (username, password_hash, role, status)
      VALUES ('hr_staff1', v_hash, 'EMPLOYEE', 'ACTIVE')
      RETURNING id INTO v_user_id;
    INSERT INTO employees (full_name, email, phone, gender, dob, address, status,
                           department_id, position_id, user_id)
      SELECT 'Đặng Thị HR Staff1',
             'hr_staff1@company.com', '0900000021', 'FEMALE', '1992-11-05',
             'Hà Nội', 'OFFICIAL', d.id, p.id, v_user_id
      FROM departments d, positions p
      WHERE d.dept_code = 'HR' AND p.title = 'HR_STAFF';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'hr_staff2') THEN
    INSERT INTO users (username, password_hash, role, status)
      VALUES ('hr_staff2', v_hash, 'EMPLOYEE', 'ACTIVE')
      RETURNING id INTO v_user_id;
    INSERT INTO employees (full_name, email, phone, gender, dob, address, status,
                           department_id, position_id, user_id)
      SELECT 'Hoàng Văn HR Staff2',
             'hr_staff2@company.com', '0900000022', 'MALE', '1993-04-18',
             'Hà Nội', 'OFFICIAL', d.id, p.id, v_user_id
      FROM departments d, positions p
      WHERE d.dept_code = 'HR' AND p.title = 'HR_STAFF';
  END IF;

  ----------------------------------------------------------------------
  -- ADMIN
  ----------------------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin_lead') THEN
    INSERT INTO users (username, password_hash, role, status)
      VALUES ('admin_lead', v_hash, 'DEPT_LEAD', 'ACTIVE')
      RETURNING id INTO v_user_id;
    INSERT INTO employees (full_name, email, phone, gender, dob, address, status,
                           department_id, position_id, user_id)
      SELECT 'Vũ Thị Admin Manager',
             'admin_lead@company.com', '0900000030', 'FEMALE', '1980-09-09',
             'Hà Nội', 'OFFICIAL', d.id, p.id, v_user_id
      FROM departments d, positions p
      WHERE d.dept_code = 'ADMIN' AND p.title = 'DEPT_LEAD'
      RETURNING id INTO v_emp_id;
    UPDATE departments SET manager_id = v_emp_id WHERE dept_code = 'ADMIN';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin_staff1') THEN
    INSERT INTO users (username, password_hash, role, status)
      VALUES ('admin_staff1', v_hash, 'EMPLOYEE', 'ACTIVE')
      RETURNING id INTO v_user_id;
    INSERT INTO employees (full_name, email, phone, gender, dob, address, status,
                           department_id, position_id, user_id)
      SELECT 'Đỗ Văn Admin Staff1',
             'admin_staff1@company.com', '0900000031', 'MALE', '1990-12-12',
             'Hà Nội', 'OFFICIAL', d.id, p.id, v_user_id
      FROM departments d, positions p
      WHERE d.dept_code = 'ADMIN' AND p.title = 'ADMIN_STAFF';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin_staff2') THEN
    INSERT INTO users (username, password_hash, role, status)
      VALUES ('admin_staff2', v_hash, 'EMPLOYEE', 'ACTIVE')
      RETURNING id INTO v_user_id;
    INSERT INTO employees (full_name, email, phone, gender, dob, address, status,
                           department_id, position_id, user_id)
      SELECT 'Bùi Thị Admin Staff2',
             'admin_staff2@company.com', '0900000032', 'FEMALE', '1991-02-28',
             'Hà Nội', 'OFFICIAL', d.id, p.id, v_user_id
      FROM departments d, positions p
      WHERE d.dept_code = 'ADMIN' AND p.title = 'ADMIN_STAFF';
  END IF;

  ----------------------------------------------------------------------
  -- FIN (Tài chính - Kế toán)
  ----------------------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'fin_lead') THEN
    INSERT INTO users (username, password_hash, role, status)
      VALUES ('fin_lead', v_hash, 'DEPT_LEAD', 'ACTIVE')
      RETURNING id INTO v_user_id;
    INSERT INTO employees (full_name, email, phone, gender, dob, address, status,
                           department_id, position_id, user_id)
      SELECT 'Phan Văn FIN Manager',
             'fin_lead@company.com', '0900000040', 'MALE', '1982-06-30',
             'Hà Nội', 'OFFICIAL', d.id, p.id, v_user_id
      FROM departments d, positions p
      WHERE d.dept_code = 'FIN' AND p.title = 'DEPT_LEAD'
      RETURNING id INTO v_emp_id;
    UPDATE departments SET manager_id = v_emp_id WHERE dept_code = 'FIN';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'fin_acct1') THEN
    INSERT INTO users (username, password_hash, role, status)
      VALUES ('fin_acct1', v_hash, 'EMPLOYEE', 'ACTIVE')
      RETURNING id INTO v_user_id;
    INSERT INTO employees (full_name, email, phone, gender, dob, address, status,
                           department_id, position_id, user_id)
      SELECT 'Ngô Thị FIN Acct1',
             'fin_acct1@company.com', '0900000041', 'FEMALE', '1994-03-25',
             'Hà Nội', 'OFFICIAL', d.id, p.id, v_user_id
      FROM departments d, positions p
      WHERE d.dept_code = 'FIN' AND p.title = 'ACCOUNTANT';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'fin_acct2') THEN
    INSERT INTO users (username, password_hash, role, status)
      VALUES ('fin_acct2', v_hash, 'EMPLOYEE', 'ACTIVE')
      RETURNING id INTO v_user_id;
    INSERT INTO employees (full_name, email, phone, gender, dob, address, status,
                           department_id, position_id, user_id)
      SELECT 'Trịnh Văn FIN Acct2',
             'fin_acct2@company.com', '0900000042', 'MALE', '1995-10-08',
             'Hà Nội', 'OFFICIAL', d.id, p.id, v_user_id
      FROM departments d, positions p
      WHERE d.dept_code = 'FIN' AND p.title = 'FINANCE_STAFF';
  END IF;

  ----------------------------------------------------------------------
  -- SALES
  ----------------------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'sales_lead') THEN
    INSERT INTO users (username, password_hash, role, status)
      VALUES ('sales_lead', v_hash, 'DEPT_LEAD', 'ACTIVE')
      RETURNING id INTO v_user_id;
    INSERT INTO employees (full_name, email, phone, gender, dob, address, status,
                           department_id, position_id, user_id)
      SELECT 'Lý Văn Sales Lead',
             'sales_lead@company.com', '0900000050', 'MALE', '1986-11-11',
             'Hà Nội', 'OFFICIAL', d.id, p.id, v_user_id
      FROM departments d, positions p
      WHERE d.dept_code = 'SALES' AND p.title = 'DEPT_LEAD'
      RETURNING id INTO v_emp_id;
    UPDATE departments SET manager_id = v_emp_id WHERE dept_code = 'SALES';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'sales_exec1') THEN
    INSERT INTO users (username, password_hash, role, status)
      VALUES ('sales_exec1', v_hash, 'EMPLOYEE', 'ACTIVE')
      RETURNING id INTO v_user_id;
    INSERT INTO employees (full_name, email, phone, gender, dob, address, status,
                           department_id, position_id, user_id)
      SELECT 'Đinh Thị Sales Exec1',
             'sales_exec1@company.com', '0900000051', 'FEMALE', '1997-05-17',
             'Hà Nội', 'OFFICIAL', d.id, p.id, v_user_id
      FROM departments d, positions p
      WHERE d.dept_code = 'SALES' AND p.title = 'SALES_EXEC';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'sales_exec2') THEN
    INSERT INTO users (username, password_hash, role, status)
      VALUES ('sales_exec2', v_hash, 'EMPLOYEE', 'ACTIVE')
      RETURNING id INTO v_user_id;
    INSERT INTO employees (full_name, email, phone, gender, dob, address, status,
                           department_id, position_id, user_id)
      SELECT 'Cao Văn Sales Exec2',
             'sales_exec2@company.com', '0900000052', 'MALE', '1996-09-23',
             'Hà Nội', 'OFFICIAL', d.id, p.id, v_user_id
      FROM departments d, positions p
      WHERE d.dept_code = 'SALES' AND p.title = 'SALES_EXEC';
  END IF;

  ----------------------------------------------------------------------
  -- MKT
  ----------------------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'mkt_lead') THEN
    INSERT INTO users (username, password_hash, role, status)
      VALUES ('mkt_lead', v_hash, 'DEPT_LEAD', 'ACTIVE')
      RETURNING id INTO v_user_id;
    INSERT INTO employees (full_name, email, phone, gender, dob, address, status,
                           department_id, position_id, user_id)
      SELECT 'Tô Thị MKT Lead',
             'mkt_lead@company.com', '0900000060', 'FEMALE', '1987-08-08',
             'Hà Nội', 'OFFICIAL', d.id, p.id, v_user_id
      FROM departments d, positions p
      WHERE d.dept_code = 'MKT' AND p.title = 'DEPT_LEAD'
      RETURNING id INTO v_emp_id;
    UPDATE departments SET manager_id = v_emp_id WHERE dept_code = 'MKT';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'mkt_exec1') THEN
    INSERT INTO users (username, password_hash, role, status)
      VALUES ('mkt_exec1', v_hash, 'EMPLOYEE', 'ACTIVE')
      RETURNING id INTO v_user_id;
    INSERT INTO employees (full_name, email, phone, gender, dob, address, status,
                           department_id, position_id, user_id)
      SELECT 'Mai Văn MKT Exec1',
             'mkt_exec1@company.com', '0900000061', 'MALE', '1995-12-30',
             'Hà Nội', 'OFFICIAL', d.id, p.id, v_user_id
      FROM departments d, positions p
      WHERE d.dept_code = 'MKT' AND p.title = 'MKT_EXEC';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'mkt_exec2') THEN
    INSERT INTO users (username, password_hash, role, status)
      VALUES ('mkt_exec2', v_hash, 'EMPLOYEE', 'ACTIVE')
      RETURNING id INTO v_user_id;
    INSERT INTO employees (full_name, email, phone, gender, dob, address, status,
                           department_id, position_id, user_id)
      SELECT 'Hồ Thị MKT Exec2',
             'mkt_exec2@company.com', '0900000062', 'FEMALE', '1996-04-04',
             'Hà Nội', 'OFFICIAL', d.id, p.id, v_user_id
      FROM departments d, positions p
      WHERE d.dept_code = 'MKT' AND p.title = 'MKT_EXEC';
  END IF;

END $$;

COMMIT;

-- ====================================================================
-- DANH SÁCH USER (để đưa cho bạn test)
-- Password chung: 12345678
-- ====================================================================
-- BOD    : bod_lead  (DEPT_LEAD)        - BOD
-- IT     : it_lead   (DEPT_LEAD)        - IT
--         : it_dev1   (EMPLOYEE)        - IT
--         : it_dev2   (EMPLOYEE)        - IT
-- HR     : hr_lead   (DEPT_LEAD)        - HR
--         : hr_staff1 (EMPLOYEE)        - HR
--         : hr_staff2 (EMPLOYEE)        - HR
-- ADMIN  : admin_lead   (DEPT_LEAD)     - ADMIN
--         : admin_staff1 (EMPLOYEE)     - ADMIN
--         : admin_staff2 (EMPLOYEE)     - ADMIN
-- FIN    : fin_lead  (DEPT_LEAD)        - FIN
--         : fin_acct1 (EMPLOYEE)        - FIN
--         : fin_acct2 (EMPLOYEE)        - FIN
-- SALES  : sales_lead (DEPT_LEAD)       - SALES
--         : sales_exec1 (EMPLOYEE)      - SALES
--         : sales_exec2 (EMPLOYEE)      - SALES
-- MKT    : mkt_lead  (DEPT_LEAD)        - MKT
--         : mkt_exec1 (EMPLOYEE)        - MKT
--         : mkt_exec2 (EMPLOYEE)        - MKT
-- SYS    : admin     (ADMIN)            - BOD
--         : director  (DIRECTOR)        - BOD
-- ====================================================================