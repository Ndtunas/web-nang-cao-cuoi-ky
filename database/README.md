# Database - Hệ Thống Quản Lý Nhân Sự (HRM)

Thư mục chứa toàn bộ thiết kế Cơ Sở Dữ Liệu: 21 bảng PostgreSQL, trigger sinh mã nghiệp vụ tự động, và migration scripts.

---

## Nguyên Tắc Thiết Kế

1. **Snowflake ID (Twitter 64-bit):** Toàn bộ khóa chính dùng `BIGINT` sinh qua hàm `fn_generate_snowflake_id()`. Không UUID, không auto-increment đơn thuần. Đảm bảo duy nhất trong hệ phân tán + tự sắp xếp theo thời gian.
2. **Database-Driven Auto Code:** Mã nhân viên (`NV00001`), mã dự án (`PRJ0001`), số quyết định (`decisionNumber`), mã timesheet, mã phiếu duyệt... đều do PostgreSQL Sequences & Triggers sinh tự động.
3. **Capacity Assessment:** Mỗi loại mã có sức chứa giới hạn được tính toán trước, có phương án mở rộng (vd `NV00001` → `NV000001` cho 1 triệu NV).
4. **ACID & Data Integrity:**
   - `ON DELETE RESTRICT` cho lịch sử nhân sự, lương, audit logs.
   - `UNIQUE` trên `emp_code`, `email`, `tax_code`, `config_key`.
   - `CHECK` constraints (`hours_spent BETWEEN 0.5 AND 24.0`).
   - Trigger tự cập nhật `updated_at` BEFORE UPDATE.

---

## Danh Sách 21 Bảng

| # | Bảng | Mô tả |
|---|---|---|
| 1 | `users` | Tài khoản đăng nhập + role |
| 2 | `employees` | Hồ sơ nhân viên |
| 3 | `system_audit_logs` | Nhật ký kiểm toán JSONB |
| 4 | `system_configs` | Cấu hình động (work rate, OT...) |
| 5 | `departments` | Phòng ban |
| 6 | `positions` | Chức vụ |
| 7 | `job_history` | Lịch sử điều chuyển |
| 8 | `salary_history` | Lịch sử tăng/giảm lương |
| 9 | `discipline_rewards` | Khen thưởng / Kỷ luật |
| 10 | `approval_requests` | Phiếu yêu cầu duyệt |
| 11 | `approval_history` | Lịch sử duyệt (multi-level) |
| 12 | `approval_configs` | Ma trận phê duyệt theo transaction type |
| 13 | `onboarding_tasks` | Checklist onboarding |
| 14 | `offboarding_tasks` | Checklist offboarding |
| 15 | `timesheets` | Timesheet tuần |
| 16 | `timesheet_entries` | Dòng timesheet theo ngày |
| 17 | `attendance_records` | Chấm công |
| 18 | `payroll_records` | Bảng lương tháng |
| 19 | `notifications` | Thông báo |
| 20 | `leave_requests` | Đơn nghỉ phép |
| 21 | `projects` | Dự án + tasks |

---

## Cấu Trúc Thư Mục

```text
database/
├── 03_schema.sql             # DDL: 21 bảng + sequences + triggers + indexes
├── migrations/               # SQL migration scripts
│   └── 001_add_reference_entity_id.sql
├── seed/                     # Dữ liệu mẫu ban đầu
│   ├── 01_initial_data.sql   # Users, employees, departments...
│   └── ...
├── 02_tables_and_relationships.md   # Mô tả chi tiết 21 bảng
└── README.md
```

---

## Cài Đặt

```bash
# Tạo database
psql -U postgres -c "CREATE DATABASE hrm_system;"

# Chạy schema (21 bảng + triggers)
psql -U postgres -d hrm_system -f database/03_schema.sql

# Chạy migrations
for f in database/migrations/*.sql; do
  psql -U postgres -d hrm_system -f "$f"
done

# Chạy seed data (optional)
psql -U postgres -d hrm_system -f database/seed/01_initial_data.sql
```

---

## Trigger Nổi Bật

| Trigger | Bảng | Mô tả |
|---|---|---|
| `trg_employees_empcode` | `employees` | Sinh `emp_code = NV00001` sau khi insert (sau trigger lấy Snowflake ID). |
| `trg_projects_code` | `projects` | Sinh `project_code = PRJ0001`. |
| `trg_timesheets_code` | `timesheets` | Sinh `timesheet_code = TS-2026-W29-NV00001`. |
| `trg_approval_request_code` | `approval_requests` | Sinh `request_code = REQ-20260721-00001`. |
| `trg_salary_history_decision` | `salary_history` | Sinh `decision_number`. |
| `trg_updated_at_*` | Nhiều bảng | Tự cập nhật `updated_at = NOW()` BEFORE UPDATE. |

---

## Snowflake ID

Sinh qua hàm `fn_generate_snowflake_id()`:
- 41-bit timestamp (ms từ epoch custom)
- 10-bit node ID (worker ID, hỗ trợ 1024 worker)
- 12-bit sequence (4096 ID/ms/worker)

Công thức: `(timestamp << 22) | (node_id << 12) | sequence`

Xem chi tiết trong `01_id_code_generation_rules.md`.

---

## Capacity Limits

| Mã | Format | Sức chứa | Mở rộng |
|---|---|---|---|
| `emp_code` | `NV00001` | 99,999 NV | `NV000001` → 999,999 NV |
| `project_code` | `PRJ0001` | 9,999 dự án | `PRJ00001` |
| `request_code` | `REQ-YYYYMMDD-NNNNN` | 99,999/ngày | Tăng N |
| `timesheet_code` | `TS-YYYY-W##-NV#####` | ~52 tuần × NV | Thêm year suffix |

---

## Migration

Tất cả thay đổi schema được lưu trong `database/migrations/` dạng file SQL có thứ tự:
```text
001_add_reference_entity_id.sql   # Thêm cột reference_entity_id vào notifications
```

Khi thêm migration mới, tạo file `NNN_description.sql` với số thứ tự tiếp theo.