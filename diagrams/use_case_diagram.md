# Sơ đồ Use Case HRM (Use Case Diagram - Report Edition)

Để đảm bảo các sơ đồ không bị quá dài, chữ không bị nhỏ khi chèn vào báo cáo tài liệu (A4), sơ đồ Use Case của hệ thống được cấu trúc lại và chia thành **3 sơ đồ phân hệ độc lập** tương ứng với các nhóm chức năng chính.

---

## 📊 1. Sơ đồ Use Case Phân hệ Nhân viên (Employee Use Cases)

Sơ đồ này biểu diễn các chức năng tự phục vụ (Self-Service) và chấm công dành cho nhân sự thông thường.

```mermaid
flowchart LR
    NV(["Nhân viên\n(Employee)"])
    
    subgraph Personal["Phân hệ Chấm công & Cá nhân"]
        direction TB
        UC_Auth(["Đăng nhập & Đổi mật khẩu"])
        UC_Profile(["Xem & Cập nhật hồ sơ"])
        UC_Checkin(["Chấm công (Check-in/out)"])
        UC_Timesheet(["Khai báo Timesheet tuần"])
        UC_Leave(["Gửi đơn xin nghỉ phép"])
        UC_Payslip(["Xem phiếu lương cá nhân"])
    end

    NV --- UC_Auth
    NV --- UC_Profile
    NV --- UC_Checkin
    NV --- UC_Timesheet
    NV --- UC_Leave
    NV --- UC_Payslip
```

---

## 📊 2. Sơ đồ Use Case Phân hệ Quản lý & Phê duyệt (Management & Approvals)

Sơ đồ này mô tả các chức năng quản lý, phân công và luồng phê duyệt đa cấp của **Trưởng phòng** và **Giám đốc**.

```mermaid
flowchart LR
    TP(["Trưởng phòng\n(Dept Lead)"])
    GD(["Giám đốc\n(Director)"])
    
    subgraph Management["Phân hệ Quản lý & Phê duyệt"]
        direction TB
        UC_Approve_Leave(["Duyệt đơn nghỉ phép"])
        UC_Approve_TS(["Duyệt Timesheet tuần"])
        UC_Onboard(["Tiếp nhận nhân viên mới (Onboarding)"])
        UC_Offboard(["Thực hiện bàn giao thôi việc"])
        UC_Calc_Salary(["Tính lương tháng"])
        UC_Approve_Salary(["Phê duyệt bảng lương"])
    end

    %% Trưởng phòng
    TP --- UC_Approve_Leave
    TP --- UC_Approve_TS
    TP --- UC_Onboard
    TP --- UC_Offboard
    TP --- UC_Calc_Salary

    %% Giám đốc
    GD --- UC_Approve_Leave
    GD --- UC_Approve_Salary
```

---

## 📊 3. Sơ đồ Use Case Phân hệ Quản trị Hệ thống (System Administration)

Sơ đồ dành riêng cho vai trò **Quản trị viên** thực hiện cấu hình hệ thống, quản lý cơ cấu tổ chức và giám sát hoạt động.

```mermaid
flowchart LR
    AD(["Quản trị viên\n(Admin)"])
    
    subgraph Administration["Phân hệ Quản trị Hệ thống"]
        direction TB
        UC_Manage_Emp(["Quản lý thông tin nhân sự (CRUD)"])
        UC_Job_Transfer(["Điều chuyển công tác / Thay đổi lương"])
        UC_Audit_Logs(["Xem nhật ký lưu vết (Audit Trail)"])
        UC_Config_Sys(["Cấu hình tham số hệ số công/OT"])
    end

    AD --- UC_Manage_Emp
    AD --- UC_Job_Transfer
    AD --- UC_Audit_Logs
    AD --- UC_Config_Sys
```

---

## 👥 4. Tác nhân & Quyền Hạn Chức Năng (Actors & Permissions)

| Tác nhân (Actor) | Vai trò hệ thống | Phạm vi quyền hạn & Chức năng chính |
| :--- | :--- | :--- |
| **Nhân viên**<br>*(Employee)* | `EMPLOYEE` | - Đăng nhập, đổi mật khẩu và xem/cập nhật thông tin cá nhân.<br>- Thực hiện chấm công hàng ngày (giờ vào/ra).<br>- Khai báo giờ công (Timesheet) làm việc theo dự án hàng tuần.<br>- Gửi đơn xin nghỉ phép và theo dõi phiếu lương cá nhân hàng tháng. |
| **Trưởng phòng**<br>*(Dept Lead)* | `DEPT_LEAD` | - Thực hiện toàn bộ chức năng của nhân viên.<br>- Phê duyệt/từ chối đơn xin nghỉ phép và bảng Timesheet tuần của nhân viên thuộc phòng ban quản lý.<br>- Thực hiện quy trình tiếp nhận nhân viên mới và bàn giao thôi việc.<br>- Tính toán bảng lương tháng của phòng ban trước khi chuyển lên cấp trên. |
| **Giám đốc**<br>*(Director)* | `DIRECTOR` | - Theo dõi toàn bộ danh sách nhân viên và tình hình chấm công trong công ty.<br>- Phê duyệt cấp cao đối với đơn xin nghỉ phép đặc biệt.<br>- Phê duyệt bảng lương tháng cuối cùng của toàn công ty để xuất chi trả. |
| **Quản trị viên**<br>*(Admin)* | `ADMIN` | - Quản lý tài khoản, phân quyền và trạng thái hoạt động của nhân sự.<br>- Quản lý danh mục phòng ban, chức vụ, dự án.<br>- Thực hiện quyết định điều chuyển công tác, điều chỉnh lương nhân viên.<br>- Truy vết lịch sử hoạt động hệ thống qua nhật ký Audit Logs.<br>- Cấu hình các tham số/hệ số giờ công động (`work_rate_configs`). |
