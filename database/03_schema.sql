-- ====================================================================
-- SYSTEM HRM DATABASE SCHEMA DDL SCRIPT (100% Pure PostgreSQL Language)
-- Target RDBMS: PostgreSQL 14+ / 15+ / 16+
-- Fully implements: 21 Tables, Snowflake 64-bit ID Engine, Smart Code Generators,
-- Foreign Keys, Check Constraints, Triggers & Performance Indexes.
-- ====================================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================================================================
-- 1. SEQUENCES FOR SNOWFLAKE ID & BUSINESS CODES
-- ====================================================================
CREATE SEQUENCE IF NOT EXISTS snowflake_seq START WITH 1 INCREMENT BY 1 MAXVALUE 4095 CYCLE;
CREATE SEQUENCE IF NOT EXISTS project_code_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS approval_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS transfer_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS salary_seq START WITH 1 INCREMENT BY 1;

-- ====================================================================
-- 2. HELPER FUNCTIONS: SNOWFLAKE 64-BIT ID & SMART CODE ENGINES
-- ====================================================================

-- 2.1 Snowflake ID Generator (64-bit BigInt)
CREATE OR REPLACE FUNCTION fn_generate_snowflake_id() 
RETURNS BIGINT AS $$
DECLARE
  our_epoch BIGINT := 1767225600000; -- Epoch: 2026-01-01 00:00:00 UTC
  seq_id BIGINT;
  now_millis BIGINT;
  worker_id BIGINT := 1; -- Node ID
  result BIGINT := 0;
BEGIN
  SELECT NEXTVAL('snowflake_seq') INTO seq_id;
  SELECT FLOOR(EXTRACT(EPOCH FROM clock_timestamp()) * 1000) INTO now_millis;
  result := (now_millis - our_epoch) << 22;
  result := result | (worker_id << 12);
  result := result | (seq_id % 4096);
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 2.2 Unaccent Helper Function for Vietnamese Name Parsing
CREATE OR REPLACE FUNCTION fn_remove_vietnamese_accents(str TEXT) RETURNS TEXT AS $$
DECLARE result TEXT := str;
BEGIN
  result := regexp_replace(result, '[àáạảãâầấậẩẫăằắặẳẵ]', 'a', 'g');
  result := regexp_replace(result, '[ÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴ]', 'A', 'g');
  result := regexp_replace(result, '[èéẹẻẽêềếệểễ]', 'e', 'g');
  result := regexp_replace(result, '[ÈÉẸẺẼÊỀẾỆỂỄ]', 'E', 'g');
  result := regexp_replace(result, '[ìíịỉĩ]', 'i', 'g');
  result := regexp_replace(result, '[ÌÍỊỈĨ]', 'I', 'g');
  result := regexp_replace(result, '[òóọỏõôồốộổỗơờớợởỡ]', 'o', 'g');
  result := regexp_replace(result, '[ÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠ]', 'O', 'g');
  result := regexp_replace(result, '[ùúụủũưừứựửữ]', 'u', 'g');
  result := regexp_replace(result, '[ÙÚỤỦŨƯỪỨỰỬỮ]', 'U', 'g');
  result := regexp_replace(result, '[ỳýỵỷỹ]', 'y', 'g');
  result := regexp_replace(result, '[ỲÝỴỶỸ]', 'Y', 'g');
  result := regexp_replace(result, '[đ]', 'd', 'g');
  result := regexp_replace(result, '[Đ]', 'D', 'g');
  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2.3 Smart EmpCode Generator (First Name + Initials of Family/Middle + Num if duplicate)
-- Example: "Lê Minh Bảo" -> "BaoLM" (or "BaoLM2" if "BaoLM" already exists)
CREATE OR REPLACE FUNCTION fn_generate_emp_code(p_full_name TEXT) RETURNS TEXT AS $$
DECLARE
  clean_name TEXT;
  words TEXT[];
  words_count INT;
  first_name TEXT;
  initials TEXT := '';
  base_code TEXT;
  final_code TEXT;
  counter INT := 1;
  exists_count INT;
  i INT;
BEGIN
  clean_name := trim(fn_remove_vietnamese_accents(p_full_name));
  words := regexp_split_to_array(clean_name, '\s+');
  words_count := array_length(words, 1);
  
  IF words_count IS NULL OR words_count = 0 THEN
    base_code := 'Emp';
  ELSIF words_count = 1 THEN
    base_code := initcap(words[1]);
  ELSE
    first_name := initcap(words[words_count]);
    FOR i IN 1..(words_count - 1) LOOP
      IF length(words[i]) > 0 THEN
        initials := initials || upper(substring(words[i] from 1 for 1));
      END IF;
    END LOOP;
    base_code := first_name || initials;
  END IF;

  final_code := base_code;
  LOOP
    SELECT COUNT(*) INTO exists_count FROM employees WHERE emp_code = final_code;
    IF exists_count = 0 THEN EXIT; END IF;
    counter := counter + 1;
    final_code := base_code || counter::TEXT;
  END LOOP;

  RETURN final_code;
END;
$$ LANGUAGE plpgsql;

-- 2.4 Smart RequestCode Generator (Transaction Type Prefix + YYYYMM + Sequence)
CREATE OR REPLACE FUNCTION fn_generate_approval_request_code() RETURNS TRIGGER AS $$
DECLARE
  prefix TEXT;
  seq_num INT;
  year_month TEXT;
BEGIN
  IF NEW.transaction_type LIKE 'LEAVE%' THEN prefix := 'LEAVE';
  ELSIF NEW.transaction_type = 'TIMESHEET' THEN prefix := 'TS';
  ELSIF NEW.transaction_type = 'SALARY_ADJUSTMENT' THEN prefix := 'SAL';
  ELSIF NEW.transaction_type = 'OFFBOARDING' THEN prefix := 'OFFB';
  ELSIF NEW.transaction_type = 'JOB_TRANSFER' THEN prefix := 'TRANS';
  ELSE prefix := 'REQ';
  END IF;

  year_month := TO_CHAR(CURRENT_DATE, 'YYYYMM');
  SELECT NEXTVAL('approval_seq') INTO seq_num;
  
  NEW.request_code := prefix || '-' || year_month || '-' || LPAD(seq_num::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2.5 Updated At Timestamp Function
CREATE OR REPLACE FUNCTION fn_update_timestamp() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ====================================================================
-- 3. CREATE ALL 21 TABLES (SNOWFLAKE ID BIGINT PRIMARY KEYS)
-- ====================================================================

-- 1. `users`
CREATE TABLE IF NOT EXISTS users (
  id BIGINT PRIMARY KEY DEFAULT fn_generate_snowflake_id(),
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'CHAIRMAN', 'DIRECTOR', 'DEPT_LEAD', 'EMPLOYEE')),
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  refresh_token VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. `system_audit_logs`
CREATE TABLE IF NOT EXISTS system_audit_logs (
  id BIGINT PRIMARY KEY DEFAULT fn_generate_snowflake_id(),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  actor_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  actor_role VARCHAR(20) NOT NULL,
  action_type VARCHAR(20) NOT NULL CHECK (action_type IN ('CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'LOGIN', 'LOGOUT', 'EXPORT')),
  entity_name VARCHAR(50) NOT NULL,
  entity_id VARCHAR(100) NOT NULL,
  old_data JSONB,
  new_data JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT
);

-- 3. `work_rate_configs`
CREATE TABLE IF NOT EXISTS work_rate_configs (
  id BIGINT PRIMARY KEY DEFAULT fn_generate_snowflake_id(),
  config_key VARCHAR(50) NOT NULL UNIQUE,
  config_name VARCHAR(100) NOT NULL,
  value_multiplier NUMERIC(5,2) NOT NULL,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  updated_by_id BIGINT REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. `positions`
CREATE TABLE IF NOT EXISTS positions (
  id BIGINT PRIMARY KEY DEFAULT fn_generate_snowflake_id(),
  title VARCHAR(100) NOT NULL,
  base_salary_ratio NUMERIC(4,2) NOT NULL DEFAULT 1.0,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. `departments`
CREATE TABLE IF NOT EXISTS departments (
  id BIGINT PRIMARY KEY DEFAULT fn_generate_snowflake_id(),
  dept_code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  manager_id BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. `employees`
CREATE TABLE IF NOT EXISTS employees (
  id BIGINT PRIMARY KEY DEFAULT fn_generate_snowflake_id(),
  emp_code VARCHAR(30) UNIQUE,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  phone VARCHAR(20),
  gender VARCHAR(10) CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),
  dob DATE,
  address TEXT,
  tax_code VARCHAR(20),
  bank_name VARCHAR(50),
  bank_account VARCHAR(50),
  join_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'ONBOARDING' CHECK (status IN ('ONBOARDING', 'PROBATION', 'OFFICIAL', 'SUSPENDED', 'NOTICE_PERIOD', 'TERMINATED')),
  department_id BIGINT REFERENCES departments(id) ON DELETE RESTRICT,
  position_id BIGINT REFERENCES positions(id) ON DELETE RESTRICT,
  user_id BIGINT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  annual_leave_balance INT NOT NULL DEFAULT 12 CHECK (annual_leave_balance >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE departments ADD CONSTRAINT fk_dept_manager FOREIGN KEY (manager_id) REFERENCES employees(id) ON DELETE SET NULL;

-- 7. `projects`
CREATE TABLE IF NOT EXISTS projects (
  id BIGINT PRIMARY KEY DEFAULT fn_generate_snowflake_id(),
  project_code VARCHAR(30) UNIQUE,
  name VARCHAR(150) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  pm_id BIGINT REFERENCES employees(id) ON DELETE RESTRICT,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. `project_tasks`
CREATE TABLE IF NOT EXISTS project_tasks (
  id BIGINT PRIMARY KEY DEFAULT fn_generate_snowflake_id(),
  project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_name VARCHAR(150) NOT NULL,
  description TEXT,
  estimated_hours NUMERIC(6,2) DEFAULT 0.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. `approval_configs`
CREATE TABLE IF NOT EXISTS approval_configs (
  id BIGINT PRIMARY KEY DEFAULT fn_generate_snowflake_id(),
  transaction_type VARCHAR(50) NOT NULL UNIQUE,
  required_levels INT NOT NULL DEFAULT 1,
  approver_roles_sequence JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. `approval_requests`
CREATE TABLE IF NOT EXISTS approval_requests (
  id BIGINT PRIMARY KEY DEFAULT fn_generate_snowflake_id(),
  request_code VARCHAR(50) UNIQUE,
  transaction_type VARCHAR(50) NOT NULL,
  reference_entity_id VARCHAR(100) NOT NULL,
  requester_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  current_level INT NOT NULL DEFAULT 1,
  total_levels INT NOT NULL DEFAULT 1,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. `approval_step_histories`
CREATE TABLE IF NOT EXISTS approval_step_histories (
  id BIGINT PRIMARY KEY DEFAULT fn_generate_snowflake_id(),
  request_id BIGINT NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
  step_level INT NOT NULL,
  approver_role VARCHAR(20) NOT NULL,
  approver_id BIGINT REFERENCES employees(id) ON DELETE SET NULL,
  action VARCHAR(20) NOT NULL CHECK (action IN ('APPROVE', 'REJECT')),
  comment TEXT,
  action_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. `timesheets`
CREATE TABLE IF NOT EXISTS timesheets (
  id BIGINT PRIMARY KEY DEFAULT fn_generate_snowflake_id(),
  timesheet_code VARCHAR(50) UNIQUE,
  employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  week_number INT NOT NULL,
  year INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_normal_hours NUMERIC(5,2) DEFAULT 0.0,
  total_ot_hours NUMERIC(5,2) DEFAULT 0.0,
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  approval_request_id BIGINT REFERENCES approval_requests(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(employee_id, week_number, year)
);

-- 13. `timesheet_entries`
CREATE TABLE IF NOT EXISTS timesheet_entries (
  id BIGINT PRIMARY KEY DEFAULT fn_generate_snowflake_id(),
  timesheet_id BIGINT NOT NULL REFERENCES timesheets(id) ON DELETE CASCADE,
  project_id BIGINT REFERENCES projects(id) ON DELETE RESTRICT,
  task_id BIGINT REFERENCES project_tasks(id) ON DELETE RESTRICT,
  entry_date DATE NOT NULL,
  hours_spent NUMERIC(4,2) NOT NULL CHECK (hours_spent >= 0.5 AND hours_spent <= 24.0),
  work_type VARCHAR(20) NOT NULL CHECK (work_type IN ('NORMAL', 'OT_WEEKDAY', 'OT_WEEKEND', 'OT_HOLIDAY', 'NIGHT_SHIFT')),
  applied_rate NUMERIC(4,2) NOT NULL DEFAULT 1.0,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. `onboarding_tasks`
CREATE TABLE IF NOT EXISTS onboarding_tasks (
  id BIGINT PRIMARY KEY DEFAULT fn_generate_snowflake_id(),
  employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  task_title VARCHAR(150) NOT NULL,
  target_department VARCHAR(20) NOT NULL CHECK (target_department IN ('HR', 'IT', 'ADMIN', 'DIRECT_DEPT')),
  assigned_by_id BIGINT REFERENCES employees(id),
  assignee_id BIGINT REFERENCES employees(id),
  due_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED')),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 15. `offboarding_tasks`
CREATE TABLE IF NOT EXISTS offboarding_tasks (
  id BIGINT PRIMARY KEY DEFAULT fn_generate_snowflake_id(),
  employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  task_title VARCHAR(150) NOT NULL,
  target_department VARCHAR(20) NOT NULL CHECK (target_department IN ('HR', 'IT', 'ADMIN', 'DIRECT_DEPT')),
  assigned_by_id BIGINT REFERENCES employees(id),
  assignee_id BIGINT REFERENCES employees(id),
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED')),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 16. `notifications`
CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT PRIMARY KEY DEFAULT fn_generate_snowflake_id(),
  recipient_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  link_url VARCHAR(255),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 17. `job_histories`
CREATE TABLE IF NOT EXISTS job_histories (
  id BIGINT PRIMARY KEY DEFAULT fn_generate_snowflake_id(),
  decision_number VARCHAR(50) NOT NULL UNIQUE,
  employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  effective_date DATE NOT NULL,
  old_department_id BIGINT REFERENCES departments(id),
  new_department_id BIGINT REFERENCES departments(id),
  old_position_id BIGINT REFERENCES positions(id),
  new_position_id BIGINT REFERENCES positions(id),
  approval_request_id BIGINT REFERENCES approval_requests(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 18. `salary_histories`
CREATE TABLE IF NOT EXISTS salary_histories (
  id BIGINT PRIMARY KEY DEFAULT fn_generate_snowflake_id(),
  addendum_number VARCHAR(50) NOT NULL UNIQUE,
  employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  effective_date DATE NOT NULL,
  old_base_salary NUMERIC(12,2) NOT NULL,
  new_base_salary NUMERIC(12,2) NOT NULL,
  old_ratio NUMERIC(4,2) NOT NULL,
  new_ratio NUMERIC(4,2) NOT NULL,
  approval_request_id BIGINT REFERENCES approval_requests(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 19. `attendances`
CREATE TABLE IF NOT EXISTS attendances (
  id BIGINT PRIMARY KEY DEFAULT fn_generate_snowflake_id(),
  employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  check_in TIME,
  check_out TIME,
  work_hours NUMERIC(4,2) DEFAULT 0.0,
  status VARCHAR(20) NOT NULL DEFAULT 'PRESENT',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(employee_id, work_date)
);

-- 20. `leave_requests`
CREATE TABLE IF NOT EXISTS leave_requests (
  id BIGINT PRIMARY KEY DEFAULT fn_generate_snowflake_id(),
  employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type VARCHAR(30) NOT NULL CHECK (leave_type IN ('ANNUAL_LEAVE', 'SICK_LEAVE', 'MATERNITY_LEAVE', 'UNPAID_LEAVE', 'COMPASSIONATE_LEAVE')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
  approval_request_id BIGINT REFERENCES approval_requests(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 21. `salaries`
CREATE TABLE IF NOT EXISTS salaries (
  id BIGINT PRIMARY KEY DEFAULT fn_generate_snowflake_id(),
  payroll_code VARCHAR(50) NOT NULL UNIQUE,
  employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INT NOT NULL CHECK (year >= 2026),
  base_salary NUMERIC(12,2) NOT NULL,
  work_days NUMERIC(4,2) NOT NULL DEFAULT 0.0,
  ot_normal_hours NUMERIC(5,2) DEFAULT 0.0,
  ot_weekend_hours NUMERIC(5,2) DEFAULT 0.0,
  ot_holiday_hours NUMERIC(5,2) DEFAULT 0.0,
  ot_pay_amount NUMERIC(12,2) DEFAULT 0.0,
  night_shift_hours NUMERIC(5,2) DEFAULT 0.0,
  night_shift_bonus NUMERIC(12,2) DEFAULT 0.0,
  allowance NUMERIC(12,2) DEFAULT 0.0,
  deduction NUMERIC(12,2) DEFAULT 0.0,
  net_salary NUMERIC(12,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PAID')),
  approval_request_id BIGINT REFERENCES approval_requests(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(employee_id, month, year)
);

-- ====================================================================
-- 4. TRIGGERS FOR AUTOMATIC CODE GENERATION & UPDATED_AT
-- ====================================================================

-- 4.1 Trigger Auto EmpCode: Name + Initials + Num
CREATE OR REPLACE FUNCTION fn_trg_employees_auto_code() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.id IS NULL THEN
    NEW.id := fn_generate_snowflake_id();
  END IF;
  IF NEW.emp_code IS NULL OR NEW.emp_code = '' THEN
    NEW.emp_code := fn_generate_emp_code(NEW.full_name);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_emp_code
BEFORE INSERT ON employees
FOR EACH ROW EXECUTE FUNCTION fn_trg_employees_auto_code();

-- 4.2 Auto Generate Smart Request Code
CREATE TRIGGER trg_auto_request_code
BEFORE INSERT ON approval_requests
FOR EACH ROW EXECUTE FUNCTION fn_generate_approval_request_code();

-- 4.3 Automatic Updated At Triggers
CREATE TRIGGER trg_update_users_time BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();
CREATE TRIGGER trg_update_employees_time BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();
CREATE TRIGGER trg_update_departments_time BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();
CREATE TRIGGER trg_update_projects_time BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();
CREATE TRIGGER trg_update_timesheets_time BEFORE UPDATE ON timesheets FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();
CREATE TRIGGER trg_update_salaries_time BEFORE UPDATE ON salaries FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

-- ====================================================================
-- 5. INDEXES FOR HIGH-PERFORMANCE QUERY OPTIMIZATION
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_emp_dept ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_emp_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON system_audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_time ON system_audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_timesheet_emp_week ON timesheets(employee_id, week_number, year);
CREATE INDEX IF NOT EXISTS idx_approval_req_status ON approval_requests(requester_id, status);
CREATE INDEX IF NOT EXISTS idx_onboarding_emp ON onboarding_tasks(employee_id, status);
CREATE INDEX IF NOT EXISTS idx_offboarding_emp ON offboarding_tasks(employee_id, status);
