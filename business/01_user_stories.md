# 01. Phân Tích Câu Chuyện Người Dùng (User Stories)

Tài liệu này chi tiết hóa các **User Stories (Câu 1 trong đề thi)** cho Hệ Thống Quản Lý Nhân Sự (HRM), bao gồm Ma trận Phê duyệt Đa Cấp chuẩn hóa theo thẩm quyền doanh nghiệp.

---

## 👥 1. Các Vai Trò & Cấp Bậc Phê Duyệt Trong Hệ Thống (Approval Hierarchy)

* **Level 4 - Chủ tịch (Chairman / President):** Phê duyệt các giao dịch cấp đặc biệt (Ngân sách tổ chức lớn, nhân sự C-Level).
* **Level 3 - Giám đốc (Director / CEO):** Phê duyệt các kế hoạch thăng tiến, tăng lương, thôi việc/offboarding nhân viên, kế hoạch tuyển dụng và bảng lương tháng.
* **Level 2 - Trưởng phòng / HR Lead / PM (Dept Lead / HR Manager / PM):** Phê duyệt đơn xin nghỉ phép (ngắn ngày/dài ngày), duyệt Timesheet, đánh giá thử việc và đề xuất điều chuyển.
* **Level 1 - Thành viên / Nhân viên (Employee):** Khai báo Timesheet hàng ngày/tuần, nộp đơn xin nghỉ phép, gửi đơn thôi việc.
* **System Admin (Quản trị hệ thống):** Quản lý tài khoản, phân quyền vai trò, kiểm tra nhật ký lưu vết giao dịch (Audit Log) toàn hệ thống.

---

## 📝 2. Danh Sách User Stories Theo Mô-đun

### 🔹 Mô-đun 1: Nhật Ký Lưu Vết Giao Dịch Toàn Hệ Thống (System Audit Trail - Cho Admin)
- **US-01:** Là **Admin**, tôi muốn hệ thống tự động ghi vết (Log) 100% tất cả các giao dịch và thao tác của người dùng (`CREATE`, `UPDATE`, `DELETE`, `APPROVE`, `REJECT`, `LOGIN`, `EXPORT`) kèm thời gian, địa chỉ IP và trạng thái dữ liệu Trước/Sau khi thay đổi.
- **US-02:** Là **Admin**, tôi muốn xem Dashboard tra cứu Nhật ký Giao dịch (Audit Log Viewer) với bộ lọc đa chiều.
- **US-03:** Là **Admin**, tôi muốn xem giao diện so sánh khác biệt dữ liệu (Diff View: Old Data vs. New Data).

### 🔹 Mô-đun 2: Xác thực & Cấu hình Tham số Động (Auth & Dynamic Config)
- **US-04:** Là **Người dùng**, tôi muốn đăng nhập bằng Email và Mật khẩu để truy cập an toàn vào hệ thống.
- **US-05:** Là **Admin**, tôi muốn phân quyền truy cập theo vai trò (`ADMIN`, `CHAIRMAN`, `DIRECTOR`, `DEPT_LEAD`, `EMPLOYEE`).
- **US-06:** Là **Admin / HR Manager**, tôi muốn cấu hình động Bảng Hệ số Giờ công (Hệ số OT, Phụ cấp ca đêm, Ngày công tiêu chuẩn) trên giao diện thay vì hardcode.

### 🔹 Mô-đun 3: Quản lý & Khai Báo Timesheet (Timesheet Management)
- **US-07:** Là **Nhân viên**, tôi muốn khai báo Timesheet hàng ngày (Dự án, Công việc, Số giờ làm và Mô tả).
- **US-08:** Là **Nhân viên**, tôi muốn chọn Loại giờ công khi khai Timesheet (`NORMAL`, `OT_WEEKDAY`, `OT_WEEKEND`, `OT_HOLIDAY`, `NIGHT_SHIFT`).
- **US-09:** Là **Nhân viên**, tôi muốn gửi (Submit) bảng Timesheet tuần để Quản lý dự án (PM) và Trưởng phòng duyệt (2 cấp).
- **US-10:** Là **Project Manager (PM) / Trưởng phòng**, tôi muốn kiểm tra và duyệt (`APPROVE`) hoặc từ chối (`REJECT`) Timesheet.
- **US-11:** Là **HR Manager**, tôi muốn tổng hợp dữ liệu giờ làm ngoài giờ (OT) từ Timesheet để tự động tính tiền OT vào Bảng lương tháng.

### 🔹 Mô-đun 4: Quy Trình Phê Duyệt Đa Cấp (Multi-Level Approval Engine)
- **US-12:** Là **Admin**, tôi muốn cấu hình Ma trận Phê duyệt (Approval Matrix) cho từng loại giao dịch.
- **US-13:** Là **Người tạo yêu cầu**, tôi muốn theo dõi tiến độ phê duyệt đa cấp theo thời gian thực (Ví dụ: `Đã duyệt Cấp 1/2 (Trưởng phòng)` $\rightarrow$ `Chờ Cấp 2/2 (HR Lead)`).
- **US-14:** Là **Cấp duyệt**, tôi muốn nhận thông báo khi có yêu cầu chuyển đến cấp của mình để duyệt hoặc từ chối.

### 🔹 Mô-đun 5: Quy trình Onboarding Phối hợp Liên Phòng Ban
- **US-15:** Là **HR Manager**, tôi muốn khởi tạo đề xuất Tuyển dụng / Onboarding nhân viên mới.
- **US-16:** Là **IT Lead**, tôi muốn nhận thông báo task cấp thiết bị và phân công (Assign/Delegate) cho nhân viên IT Support trong team.
- **US-17:** Là **Admin Staff**, tôi muốn tiếp nhận task chuẩn bị chỗ ngồi và thẻ ra vào.
- **US-18:** Là **HR Manager**, tôi muốn theo dõi dashboard tiến độ Onboarding realtime.

### 🔹 Mô-đun 6: Quy trình Offboarding & Thanh lý Hợp đồng (3 Cấp Duyệt đến Giám đốc)
- **US-19:** Là **Nhân viên**, tôi muốn nộp Đơn xin thôi việc trực tuyến.
- **US-20:** Là **Hệ thống**, tôi muốn kích hoạt luồng phê duyệt 3 cấp cho Đơn xin thôi việc (Cấp 1: Trưởng phòng $\rightarrow$ Cấp 2: HR Lead $\rightarrow$ Cấp 3: Giám đốc).
- **US-21:** Là **IT Lead & Admin Staff**, tôi muốn nhận task thu hồi tài sản và khóa tài khoản khi đơn thôi việc được duyệt đủ 3 cấp.
- **US-22:** Là **HR Manager**, tôi muốn thực hiện quy trình Quyết toán hợp đồng và chuyển trạng thái sang `TERMINATED`.

### 🔹 Mô-đun 7: Quản lý Các Loại Thay Đổi Nhân Sự & Tăng Lương
- **US-23a:** Là **Nhân viên / HR**, tôi muốn cập nhật Thông tin cá nhân & liên hệ (Duyệt 1 cấp: HR Lead).
- **US-23b:** Là **HR Manager**, tôi muốn lập Yêu cầu Điều chuyển công tác (Duyệt 2 cấp: Trưởng phòng cũ/mới $\rightarrow$ Giám đốc).
- **US-23c:** Là **HR Manager**, tôi muốn lập Yêu cầu Tăng lương / Điều chỉnh phụ cấp nhân viên (Duyệt 3 cấp: Trưởng phòng $\rightarrow$ HR Lead $\rightarrow$ Giám đốc).
- **US-23d:** Là **HR Manager**, tôi muốn cập nhật trạng thái Khen thưởng / Kỷ luật nhân viên.

### 🔹 Mô-đun 8: Chấm công, Phê duyệt Đơn Nghỉ Phép & Bảng Lương
- **US-24a:** Là **Nhân viên**, tôi muốn nộp Đơn xin nghỉ phép ngắn ngày ($\le 2$ ngày - Duyệt 1 cấp: Trưởng phòng trực tiếp).
- **US-24b:** Là **Nhân viên**, tôi muốn nộp Đơn xin nghỉ phép dài ngày ($> 2$ ngày - Duyệt 2 cấp: Trưởng phòng trực tiếp $\rightarrow$ HR Lead).
- **US-25:** Là **HR Manager**, tôi muốn chạy thuật toán tính lương tháng (nạp các hệ số cấu hình động từ `WorkRateConfig` và tiền OT) và gửi đề xuất Chốt bảng lương (Duyệt 2 cấp: HR Lead $\rightarrow$ Giám đốc).
- **US-26:** Là **Nhân viên**, tôi muốn xem phiếu lương (Payslip) cá nhân hàng tháng.
