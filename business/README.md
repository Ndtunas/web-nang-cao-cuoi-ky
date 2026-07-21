# Tài Liệu Phân Tích Nghiệp Vụ - Hệ Thống Quản Lý Nhân Sự (HRM)

Thư mục này chứa toàn bộ các tài liệu phân tích nghiệp vụ, mô hình hóa đối tượng và thiết kế kiến trúc cho dự án **Hệ Thống Quản Lý Nhân Sự (HRM System)** thuộc Bài Tập Lớn Cuối Kỳ môn **Web Nâng Cao** (Lớp N01_LT1 - Trường Đại học Phenikaa).

---

## 📚 Danh Mục Tài Liệu Nghiệp Vụ

1. [01. User Stories (Câu chuyện người dùng)](./01_user_stories.md)
   - Phân tích Cấp bậc Phê duyệt (Chủ tịch -> Giám đốc -> Trưởng phòng / HR Lead / PM -> Member).
   - Quy trình Duyệt 1 cấp, 2 cấp và 3 cấp.
   - Mô-đun Nhật ký Lưu Vết Giao Dịch Toàn Hệ Thống (`System Audit Trail` cho Admin).
   - Cấu hình động Bảng Hệ số Giờ công & Tỷ lệ OT (không hardcode).
   - Mô-đun Quản lý & Khai báo Timesheet Dự án (Daily/Weekly Timesheet).
   - Quy trình Onboarding & Offboarding liên phòng ban.
   - Phân loại 4 nhóm biến động thay đổi thông tin nhân sự.
2. [02. Domain Model (Mô hình hóa đối tượng)](./02_domain_model.md)
   - 21 Thực thể chính (`User`, `SystemAuditLog`, `WorkRateConfig`, `Project`, `ProjectTask`, `Timesheet`, `TimesheetEntry`, `ApprovalConfig`, `ApprovalRequest`, `ApprovalStepHistory`, `Employee`, `Department`, `Position`, `JobHistory`, `SalaryHistory`, `OnboardingTask`, `OffboardingTask`, `Attendance`, `Salary`).
3. [03. Workflows & Algorithms (Quy trình nghiệp vụ & Thuật toán)](./03_workflows.md)
   - 10 Sơ đồ luồng hoạt động & thuật toán (Sequence & Activity Diagrams).
   - Bảng Ma Trận Phê Duyệt Đa Cấp (Approval Matrix) chuẩn hóa.
   - Quy trình Tự Động Lưu Vết Giao Dịch (Automated Audit Logging Interceptor).
   - Quy trình Khai Báo & Phê Duyệt Timesheet Tuần (Weekly Timesheet Workflow).
   - Thuật toán & Công thức tính Lương nạp động tham số từ `WorkRateConfig`.
4. [04. Architecture & API Specs (Kiến trúc phân lớp & API)](./04_architecture.md)
   - Mô hình phân lớp Layered Architecture 3 lớp.
   - Quy hoạch 100% RESTful API endpoints & Bảng Checklist Phủ Khớp API vs User Stories.
5. [05. Business Values & Constants Specification (Giá trị nghiệp vụ & Hằng số)](./05_business_values.md)
   - Quy định danh sách Enums hệ thống (`UserRole`, `EmployeeStatus`, `WorkType`, `TransactionType`, `ApprovalStatus`).
   - Bảng giá trị mặc định của hệ số giờ công & OT (`WorkRateConfig`).
   - Quy định Ràng buộc Xác thực Dữ liệu (Validation Rules) và Bảng Mã Lỗi Nghiệp Vụ Chuẩn (`ERR_AUTH_001`, `ERR_LEAVE_001`...).

---

## 🎯 Tóm Tắt Phạm Vi Nghiệp Vụ Dự Án

- **Giá Trị Nghiệp Vụ & Hằng Số Chuẩn (Business Values):** Đã chuẩn hóa toàn bộ Enums, Validation Rules, Default Configs và Error Codes trước khi viết mã nguồn Backend.
- **Ma Trận Phê Duyệt Đa Cấp (Approval Matrix):** Linh hoạt từ 1 đến 4 cấp duyệt tùy mức độ quan trọng giao dịch.
- **Nhật Ký Lưu Vết Giao Dịch Toàn Hệ Thống (System Audit Trail):** Tự động ghi nhận 100% các thao tác kèm dữ liệu Cũ vs. Mới (Diff View) dành cho Admin.
- **Cấu Hình Động Hệ Số Giờ Công & Tỷ Lệ OT (Dynamic Work Rate Engine):** Quản lý cấu hình linh hoạt hệ số OT ngày thường, cuối tuần, ngày lễ, phụ cấp ca đêm thông qua CSDL.
- **Quản lý & Khai Báo Timesheet Dự Án:** Khai giờ công theo Dự án/Task, phân loại giờ tiêu chuẩn và giờ OT.
- **Quản lý Onboarding & Offboarding Nhân viên:** Khởi tạo hồ sơ, cấp mã NV/tài khoản, Task checklist tiếp nhận (HR, IT, Admin), quyết toán thôi việc.
- **Quản lý Bảng lương:** Tự động tính lương tháng nạp động các tham số hệ số từ `WorkRateConfig`.
