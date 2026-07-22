# 01. Quy Tắc Sinh Snowflake ID & Đánh Giá Cơ Chế Mở Rộng Mã Nghiệp Vụ (Scalability Mechanisms)

Tài liệu này quy định chi tiết **Chiến lược Khóa chính Snowflake ID (Twitter Snowflake 64-bit ID)** và **Rà soát Đánh giá Cơ chế Mở rộng Thông minh cho 100% các loại Mã Nghiệp Vụ trong Hệ thống**.

---

## ❄️ 1. Chiến Lược Khóa Chính Snowflake ID (Twitter Snowflake ID Strategy)

Hệ thống **TUYỆT ĐỐI KHÔNG sử dụng UUID ngẫu nhiên hay BIGINT Auto-Increment đơn thuần**, mà áp dụng chuẩn **Snowflake ID (64-bit Integer)** cho 100% các bảng dữ liệu.

### 📐 Cấu trúc 64-bit của Snowflake ID:
```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 1-bit Sign │ 41-bit Timestamp (Millis) │ 10-bit Node/Worker ID │ 12-bit Sequence │
└─────────────────────────────────────────────────────────────────────────────────┘
```
- **41-bit Thời gian:** Hoạt động liên tục trong **69 năm** (đến năm 2095).
- **10-bit Node ID:** Phân biệt tối đa **1,024 máy chủ/node** xử lý song song.
- **12-bit Sequence:** Sinh tối đa **4,096 ID / milisecond / node** (**4.096 triệu ID / giây / node**).

---

## 🔤 2. Bảng Rà Soát Cơ Chế Mở Rộng Thông Minh Cho Các Loại Mã Nghiệp Vụ (Smart Code Patterns)

Toàn bộ các loại mã nghiệp vụ hiển thị đều được thiết kế **Cơ chế gợi nhớ (Mnemonic Pattern) + Phân loại danh mục + Tự tăng linh hoạt (Dynamic Sequence)** do CSDL tự động sinh:

| Tên Loại Mã Nghiệp Vụ | Cấu Trúc Mã Thông Minh (Smart Pattern) | Cơ Chế Mở Rộng & Ý Nghĩa Nghiệp Vụ | Ví Dụ Mã Sinh Ra |
| :--- | :--- | :--- | :--- |
| **Mã Nhân Viên** (`emp_code`) | `Tên` + `Viết tắt Họ/Lót` + `Num` | Bỏ dấu + viết tắt + số tự tăng khi trùng. **Mở rộng vô hạn**. | `BaoLM`, `BaoLM2`, `NgocTTB` |
| **Mã Phòng Ban** (`dept_code`) | `Ký tự viết tắt Tên phòng` + `Num` | Tự động viết tắt từ tên phòng ban (`Công nghệ thông tin` $\rightarrow$ `CNTT`). Trùng $\rightarrow$ `CNTT2`. | `CNTT`, `NS`, `KT`, `CNTT2` |
| **Mã Dự Án** (`project_code`) | `Viết tắt Tên Dự Án` + `-` + `YYYY` + `-` + `Num` | Phân loại dự án theo Tên viết tắt + Năm + Số tự tăng. | `HRM-2026-01`, `ERP-2026-02` |
| **Mã Yêu Cầu Duyệt** (`request_code`) | `Mã Loại Giao Dịch` + `-` + `YYYYMM` + `-` + `Num` | Phân biệt loại yêu cầu (`LEAVE`, `TS`, `SAL`, `OFFB`) + Tháng + Số tự tăng. Lọc cực nhanh. | `LEAVE-202607-00001`, `SAL-202607-00001` |
| **Số Quyết Định Điều Chuyển** (`decision_number`) | `QĐ-DC/` + `Mã Phòng Mới` + `/` + `YYYY` + `/` + `Num` | Gắn liền mã phòng ban chuyển đến và Năm ra quyết định. | `QĐ-DC/CNTT/2026/001` |
| **Số Phụ Lục Tăng Lương** (`addendum_number`) | `PLHĐ/` + `MãNV` + `/` + `YYYY` + `/` + `Num` | Trích xuất theo Mã nhân viên + Năm tăng lương. | `PLHĐ/BaoLM/2026/01` |
| **Mã Timesheet Tuần** (`timesheet_code`) | `TS-` + `YYYY-W` + `Tuần` + `-` + `MãNV` | Nhìn vào mã biết ngay Tuần khai báo và Mã nhân viên. | `TS-2026-W29-BaoLM` |
| **Mã Bảng Lương Tháng** (`payroll_code`) | `PR-` + `YYYYMM` + `-` + `MãNV` | Định danh bảng lương từng tháng của từng nhân viên. | `PR-202607-BaoLM` |

---

## 💡 3. Đánh Giá Ưu Điểm Cơ Chế Mở Rộng Mới

1. **Khả Năng Tra Cứu Trực Quan (Self-Describing Codes):** Người quản lý chỉ cần nhìn vào mã (`LEAVE-202607-00001` hay `QĐ-DC/CNTT/2026/001`) là biết ngay loại đơn, phòng ban đích và mốc thời gian mà không cần query thêm thông tin.
2. **Loại Bỏ Hoàn Toàn Giới Hạn Tĩnh (No Hardcode Limits):**
   - Mã nhân viên `BaoLM`, `BaoLM2`... `BaoLM999999` cho phép trùng tên không giới hạn.
   - Mã phiếu duyệt phân tách theo từng tiền tố loại giao dịch (`LEAVE`, `TS`, `SAL`...), giúp Sequence của mỗi loại đơn chạy độc lập, tránh hiện tượng nghẽn Sequence chung.
3. **Thực Thi Tự Động Phía CSDL (100% Database Automation):** Tất cả các quy tắc mã trên đều được cài đặt bằng hàm Trigger PL/pgSQL trong Database, loại bỏ rủi ro sai lệch dữ liệu do Backend code.

---

## ⚡ 4. Code Trigger PL/pgSQL Sinh Các Mã Thông Minh

### 4.1 Trigger Sinh Mã Yêu Cầu Phê Duyệt Theo Loại Giao Dịch (`request_code`):
```sql
CREATE OR REPLACE FUNCTION fn_generate_approval_request_code() RETURNS TRIGGER AS $$
DECLARE
  prefix TEXT;
  seq_num INT;
  year_month TEXT;
BEGIN
  -- Xác định tiền tố theo loại giao dịch
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
```
