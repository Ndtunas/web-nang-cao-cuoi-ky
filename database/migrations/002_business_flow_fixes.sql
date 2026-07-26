-- ====================================================================
-- MIGRATION 002: Business Flow Fixes (Phase 1 + Phase 4)
-- Dành cho hệ thống DB đã có schema cũ — chạy idempotent.
-- Áp dụng các thay đổi:
--   1) Thêm column `annual_leave_balance` vào `employees` (Phase 1.4)
--   2) Thêm column `night_shift_hours` + `night_shift_bonus` vào `salaries` (Phase 1.1)
--   3) Backfill giá trị mặc định cho dữ liệu cũ
--
-- An toàn khi chạy nhiều lần: mỗi ALTER đều dùng IF NOT EXISTS,
-- các UPDATE đều dùng WHERE column IS NULL.
-- ====================================================================

-- 1) employees.annual_leave_balance
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS annual_leave_balance INTEGER DEFAULT 12;

-- Check constraint (idempotent — drop trước nếu đã tồn tại)
ALTER TABLE employees
  DROP CONSTRAINT IF EXISTS employees_annual_leave_balance_check;
ALTER TABLE employees
  ADD CONSTRAINT employees_annual_leave_balance_check
  CHECK (annual_leave_balance >= 0);

UPDATE employees
  SET annual_leave_balance = 12
  WHERE annual_leave_balance IS NULL;

ALTER TABLE employees
  ALTER COLUMN annual_leave_balance SET DEFAULT 12;
ALTER TABLE employees
  ALTER COLUMN annual_leave_balance SET NOT NULL;

-- 2) salaries.night_shift_hours + salaries.night_shift_bonus
ALTER TABLE salaries
  ADD COLUMN IF NOT EXISTS night_shift_hours NUMERIC(5,2) DEFAULT 0.0;
ALTER TABLE salaries
  ADD COLUMN IF NOT EXISTS night_shift_bonus NUMERIC(12,2) DEFAULT 0.0;

UPDATE salaries
  SET night_shift_hours = 0.0
  WHERE night_shift_hours IS NULL;
UPDATE salaries
  SET night_shift_bonus = 0.0
  WHERE night_shift_bonus IS NULL;

ALTER TABLE salaries
  ALTER COLUMN night_shift_hours SET DEFAULT 0.0;
ALTER TABLE salaries
  ALTER COLUMN night_shift_hours SET NOT NULL;
ALTER TABLE salaries
  ALTER COLUMN night_shift_bonus SET DEFAULT 0.0;
ALTER TABLE salaries
  ALTER COLUMN night_shift_bonus SET NOT NULL;