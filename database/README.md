# Quy Hoạch Cơ Sở Dữ Liệu & Ràng Buộc Nghiệp Vụ (Database Architecture Specification)

Thư mục này chứa toàn bộ hồ sơ thiết kế Cơ Sở Dữ Liệu (Database Design - **Đáp ứng Câu 5 & 6 trong đề thi**), bao gồm sơ đồ các bảng, mối quan hệ khóa ngoại, **Chuẩn Khóa Chính Twitter Snowflake ID (64-bit)**, **Bảng Đánh Giá Tính Giới Hạn Mã Nghiệp Vụ** và **Quy tắc Tự động Sinh Mã Nghiệp Vụ Phía Database**.

---

## 🏛 Nguyên Tắc Thiết Kế Cơ Sở Dữ Liệu

1. **Chuẩn Khóa Chính Snowflake ID (Twitter Snowflake 64-bit ID):** 100% các bảng dữ liệu **TUYỆT ĐỐI KHÔNG dùng UUID ngẫu nhiên hay BIGINT Auto-Increment đơn thuần**, mà sử dụng **Snowflake ID (`BIGINT`)** được sinh tự động thông qua hàm `fn_generate_snowflake_id()`, đảm bảo tính duy nhất tuyệt đối trong hệ thống phân tán và tự động sắp xếp theo thời gian khởi tạo.
2. **Do Database Đảm Nhận Xử Lý (Database-Driven Auto Code):** Tất cả việc sinh Mã nhân viên (`empCode`: `NV00001`), Mã dự án (`projectCode`: `PRJ0001`), Số quyết định (`decisionNumber`), Mã Timesheet, Mã phiếu duyệt đều do Database Sequences & Triggers đảm nhận.
3. **Đánh Giá Định Lượng Tính Giới Hạn (Capacity & Limits Assessment):** Tính toán sức chứa giới hạn tối đa cho từng loại mã nghiệp vụ và có sẵn phương án mở rộng khi doanh nghiệp tăng trưởng quy mô (ví dụ: `NV00001` lên `NV000001` cho 1 triệu nhân viên).
4. **Bảo Đảm Tính Đúng Đắn Dữ Liệu (ACID & Data Integrity):**
   - **Foreign Keys (`ON DELETE RESTRICT`):** Tuyệt đối không để xóa mờ dữ liệu lịch sử nhân sự, lương và audit logs.
   - **Unique Constraints:** Đảm bảo duy nhất trên các trường `emp_code`, `email`, `tax_code`, `config_key`.
   - **Check Constraints:** Kiểm tra phạm vi giá trị hợp lệ (`hours_spent BETWEEN 0.5 AND 24.0`).
   - **Automatic Audit Timestamp Triggers:** Tự động cập nhật `updated_at` thông qua Trigger `BEFORE UPDATE`.

---

## 📚 Danh Mục Tài Liệu CSDL

1. [01. Snowflake ID & Capacity Limit Assessment (Quy tắc sinh ID & Đánh giá tính giới hạn mã CSDL)](./01_id_code_generation_rules.md)
   - Cấu trúc 64-bit Snowflake ID (`Timestamp 41-bit + Node ID 10-bit + Sequence 12-bit`).
   - Bảng đánh giá định lượng sức chứa tối đa và lộ trình mở rộng khi vượt tải cho từng loại mã nghiệp vụ.
   - Quy tắc sinh mã nghiệp vụ tự động bằng Sequence & Trigger (`NV00001`, `PRJ0001`, `TS-2026-W29-NV00001`, `REQ-20260721-00001`).
2. [02. Tables Schemas & Relationships (Chi tiết 21 Bảng CSDL)](./02_tables_and_relationships.md)
   - Chi tiết thuộc tính, kiểu dữ liệu Snowflake ID, khóa chính, khóa ngoại và chỉ mục Index của 21 bảng.
3. [03. Schema DDL SQL Script (`schema.sql`)](./03_schema.sql)
   - File DDL SQL thực thi tạo hàm `fn_generate_snowflake_id()`, Tables, Foreign Keys, Sequences, Triggers & Check Constraints.
