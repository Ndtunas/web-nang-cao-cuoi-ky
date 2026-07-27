-- ====================================================================
-- MIGRATION 05: Annual Leave Balance tracking
-- Mục đích: thêm cột annual_leave_balance vào bảng employees
--          (default 12 ngày theo spec 05_business_values.md §2 MAX_ANNUAL_LEAVE_DAYS)
-- Chạy an toàn nhiều lần (idempotent) — chỉ add column nếu chưa có.
--
-- LƯU Ý: từ tháng 7/2026, nội dung migration salaries cũng đã được gộp
-- vào `database/migrations/002_business_flow_fixes.sql` để gom toàn bộ
-- thay đổi Phase 1 + Phase 4 vào một file duy nhất. File này vẫn được
-- giữ để tương thích với hệ thống đã chạy migration 05 trước đó.
-- ====================================================================

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS annual_leave_balance INTEGER DEFAULT 12;

ALTER TABLE employees
  DROP CONSTRAINT IF EXISTS employees_annual_leave_balance_check;
ALTER TABLE employees
  ADD CONSTRAINT employees_annual_leave_balance_check
  CHECK (annual_leave_balance >= 0);

-- Backfill các hồ sơ đã có NULL thành 12
UPDATE employees
  SET annual_leave_balance = 12
  WHERE annual_leave_balance IS NULL;

ALTER TABLE employees
  ALTER COLUMN annual_leave_balance SET DEFAULT 12;
ALTER TABLE employees
  ALTER COLUMN annual_leave_balance SET NOT NULL;