# Quy Hoạch Giao Diện & Bố Cục Màn Hình Frontend (Layout Specification)

Thư mục này mô tả chi tiết sơ bộ bố cục (Layouts), wireframe cấu trúc màn hình và luồng tương tác người dùng (UI/UX) cho mô-đun **Frontend** thuộc Hệ Thống Quản Lý Nhân Sự (HRM System), **chuẩn hóa 100% khớp theo từng luồng nghiệp vụ tại `business/01_user_stories.md` và `business/03_workflows.md`**.

---

## 🎨 Nguyên Tắc Thiết Kế UI/UX & Chuẩn Đa Ngôn Ngữ (UI/UX & Localization Standards)

1. **Enterprise Modern Design:** Sử dụng Ant Design (`antd` v5) kết hợp với bảng màu Dark Mode sang trọng, Glassmorphism và gradient viền.
2. **Cấu trúc Bố cục Chuẩn (App Shell Layout):**
   - **Sidebar bên trái (Collapsible Sider):** Điều hướng giữa các chức năng chính.
   - **Header cố định (Fixed Header):** Ô tìm kiếm thời gian thực, Nút chuyển đổi ngôn ngữ (Việt/Anh) và Thông tin tài khoản đăng nhập.
   - **Content Body (Khung nội dung):** Hiển thị nội dung động theo từng màn hình.
3. **💡 Quy tắc Tiêu đề Nút bấm & Tooltip (Button Titles & Tooltips Standard):**
   - **Tiêu đề nút bấm (`Button Title`):** Phải cực kỳ ngắn gọn, súc tích (chỉ từ 1 - 3 từ; ví dụ: `Thêm mới`, `Trình duyệt`, `Phê duyệt`, `Từ chối`, `Lưu`, `Xem khác biệt`, `Chốt lương`).
   - **Giải thích bổ sung (`Tooltip`):** Sử dụng linh kiện `Tooltip` của Ant Design để giải thích hành động khi người dùng di chuột (Hover), nội dung tooltip cô đọng, rõ ràng (tối đa 15-20 từ, không viết quá dài).
4. **🌐 Quy tắc Ngôn ngữ Thuần Nhất (Strict Language Consistency - Không pha trộn Anh-Việt):**
   - **TUYỆT ĐỐI KHÔNG pha trộn từ ngữ Tiếng Anh và Tiếng Việt** trên cùng một giao diện, tiêu đề hay nút bấm.
   - **Chế độ Tiếng Việt (`vi`):** 100% từ ngữ Tiếng Việt chuẩn mực doanh nghiệp (VD: `Xem khác biệt` thay vì `Xem Diff`, `Nộp tuần` thay vì `Submit tuần`, `Chờ tôi duyệt` thay vì `Pending my level`, `Nhận việc` thay vì `Onboarding`, `Thôi việc` thay vì `Offboarding`).
   - **Chế độ Tiếng Anh (`en`):** 100% từ ngữ Tiếng Anh chuẩn doanh nghiệp (VD: `View Diff`, `Submit Week`, `Pending My Approval`, `Onboarding`, `Offboarding`).

---

## 📚 Danh Mục Chi Tiết Các Màn Hình Giao Diện

1. [01. Dashboard & General Stats (Tổng quan & Thống kê)](./01_dashboard.md)
   - Bộ thẻ chỉ số nhanh (Total Employees, Active, On Leave, New Hires).
   - Biểu đồ biến động nhân sự và danh sách việc cần xử lý.
2. [02. Employee Management & Modals (Quản lý Nhân sự & 4 Nhóm Thay Đổi)](./02_employee_management.md)
   - Bảng danh sách nhân viên Ant Design (Phân trang, Lọc, Thẻ trạng thái).
   - **Form Modals 4 Nhóm Thay Đổi:** Personal Info (Group A), Job Transfer (Group B), Salary Adjustment (Group C), Discipline/Reward (Group D).
   - Tabs Checklist tiếp nhận Onboarding & bàn giao Offboarding liên phòng ban.
3. [03. Timesheet & OT Entry (Khai báo Timesheet & OT Tuần)](./03_timesheet_calendar.md)
   - Bảng lưới khai giờ công theo tuần (Daily/Weekly Grid).
   - Modal nhập số giờ OT (`NORMAL`, `OT_WEEKDAY`, `OT_WEEKEND`, `OT_HOLIDAY`, `NIGHT_SHIFT`).
4. [04. Multi-Level Approval Center (Trung tâm Phê duyệt Đa Cấp)](./04_approval_center.md)
   - Danh sách phiếu yêu cầu đang chờ duyệt (`Pending My Level`).
   - Giao diện theo dõi tiến độ duyệt đa cấp theo thời gian thực (Step Tracker 1/3, 2/3, 3/3).
5. [05. Admin Audit Log Viewer (Nhật ký Lưu vết Giao dịch)](./05_audit_log_viewer.md)
   - Bảng tra cứu nhật ký lịch sử giao dịch toàn hệ thống.
   - Modal xem chi tiết so sánh dữ liệu Trước vs. Sau (Diff View: Old Data vs. New Data).
6. [06. System Configurations (Cấu hình Tham số & Ma trận Duyệt)](./06_system_configurations.md)
   - Bảng cấu hình động hệ số giờ công & OT (`WorkRateConfig`).
   - Bảng cấu hình ma trận cấp duyệt cho các loại giao dịch (`ApprovalConfig`).
7. [07. Payroll & Payslip (Chốt Bảng Lương & Phiếu Lương Cá Nhân)](./07_payroll_management.md)
   - Giao diện chốt bảng lương tháng và chạy thuật toán tính lương nạp động tham số.
   - Giao diện xem phiếu lương (Payslip) cá nhân của nhân viên.

---

## 📋 Bảng Checklist Rà Soát Tính Phủ Khớp Giao Diện vs Luồng Nghiệp Vụ (UI vs Business Workflow Alignment)

| Nhóm Nghiệp Vụ Trong Business | Luồng Xử Lý Chi Tiết | Màn Hình Layout Phủ Khớp | Trạng Thái Phủ Khớp |
| :--- | :--- | :--- | :---: |
| **Audit Logging Engine** | Lưu vết 100% thao tác & so sánh Diff View | `05_audit_log_viewer.md` | ✅ Phủ 100% |
| **Dynamic Work Rate Config** | Cấu hình động hệ số OT trên giao diện Admin | `06_system_configurations.md` | ✅ Phủ 100% |
| **Timesheet & OT Management** | Khai giờ theo dự án, chọn loại giờ công, duyệt 2 cấp | `03_timesheet_calendar.md` | ✅ Phủ 100% |
| **Multi-Level Approval Matrix**| Duyệt 1 đến 4 cấp, theo dõi tiến độ realtime | `04_approval_center.md` | ✅ Phủ 100% |
| **Cross-Dept Onboarding** | HR, IT, Admin, Manager checklist tiếp nhận | `02_employee_management.md` | ✅ Phủ 100% |
| **Offboarding 3 Cấp** | Nộp đơn xin nghỉ, thu hồi tài sản, chốt HĐLĐ | `02_employee_management.md` | ✅ Phủ 100% |
| **4 Nhóm Thay Đổi Nhân Sự** | Form Group A (Cá nhân), Group B (Điều chuyển), Group C (Tăng lương), Group D (Khen thưởng) | `02_employee_management.md` | ✅ Phủ 100% |
| **Payroll & Payslip** | Chốt bảng lương 2 cấp, xem phiếu lương cá nhân | `07_payroll_management.md` | ✅ Phủ 100% |
