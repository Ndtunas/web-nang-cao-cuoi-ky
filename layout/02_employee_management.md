# 02. Bố Cục Màn Hình Quản Lý Nhân Sự, Modals Thay Đổi & Checklists (Employee Management Layout)

Màn hình này chuẩn hóa 100% theo các luồng nghiệp vụ tại `business/01_user_stories.md` và `business/03_workflows.md`, bao gồm danh sách nhân viên, **Wireframes Chi Tiết Cho Tabs Onboarding & Offboarding Phối Hợp Liên Phòng Ban** và **Form Modals cho 4 Nhóm Thay Đổi Nhân Sự (Group A, B, C, D)**.

---

## 📐 1. Bố Cục Giao Diện Danh Sách Nhân Viên (`Table` + `Tabs`)

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ Danh Sách Nhân Viên                                       [+ Thêm Nhân Viên Mới]        │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [👥 Tất Cả Nhân Viên]   [🚀 Onboarding (3)]   [🚪 Offboarding (2)]   [📜 Quyết Định (5)]   │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ Bộ lọc: [🔍 Tìm theo mã/tên...]  [Phòng ban: Tất cả ▾]  [Trạng thái: Tất cả ▾]             │
├───────┬───────────────────┬────────────────────┬─────────────────┬─────────────┬───────┤
│ Mã NV │ Họ và Tên         │ Phòng Ban          │ Chức Vụ         │ Trạng Thái  │Thao tác│
├───────┼───────────────────┼────────────────────┼─────────────────┼─────────────┼───────┤
│ NV001 │ Nguyễn Văn An     │ Công nghệ thông tin│ Kỹ sư Phần mềm  │ [OFFICIAL]  │ ✏️ 🔀 💰│
│ NV002 │ Trần Thị Bình     │ Nhân sự            │ Trưởng phòng HR │ [PROBATION] │ ✏️ 🔀 💰│
│ NV003 │ Lê Hoàng Cường    │ Kế toán            │ Chuyên viên KT  │ [ONBOARDING]│ ✏️ 🔀 💰│
└───────┴───────────────────┴────────────────────┴─────────────────┴─────────────┴───────┤
│ Thao tác nhanh: [✏️ Sửa TT Cá Nhân (A)]  [🔀 Điều Chuyển (B)]  [💰 Điều Chỉnh Lương (C)] │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🖼 2. Modals Cho 4 Nhóm Thay Đổi Nhân Sự (Group A, B, C, D)

### 🔹 Group A: Form Cập Nhật Thông Tin Cá Nhân (Personal Info Modal - 1 Cấp Duyệt)
```text
┌─────────────────────────────────────────────────────────────────┐
│ 📝 Cập Nhật Thông Tin Cá Nhân & Liên Hệ (Group A)          [X] │
├─────────────────────────────────────────────────────────────────┤
│ Họ và Tên: [ Nguyễn Văn An ]           Mã NV: [ NV001 ]         │
│ Số Điện Thoại *:  [ 0901234567                               ]  │
│ Email Cá Nhân *:  [ an.nguyen.personal@gmail.com             ]  │
│ Địa Chỉ Thường Trú: [ 123 Nguyễn Trãi, Thanh Xuân, Hà Nội    ]  │
│ Số CCCD / CMND *: [ 001098765432                             ]  │
│ Tình Trạng Hôn Nhân: [ Đã kết hôn                           ▾]  │
│ Số Người Phụ Thuộc (Giảm trừ thuế): [ 2                      ]  │
│ Số Tài Khoản Ngân Hàng *: [ 19034567891012 - Techcombank     ]  │
├─────────────────────────────────────────────────────────────────┤
│                                     [ Hủy Bỏ ]  [ 📤 Trình Duyệt ]│
└─────────────────────────────────────────────────────────────────┘
```

### 🔹 Group B: Form Quyết Định Điều Chuyển Công Tác (Job Transfer Modal - 2 Cấp Duyệt)
```text
┌─────────────────────────────────────────────────────────────────┐
│ 🔀 Lập Yêu Cầu Điều Chuyển Công Tác (Group B)              [X] │
├─────────────────────────────────────────────────────────────────┤
│ Nhân viên điều chuyển: Nguyễn Văn An (NV001)                    │
│ Phòng ban hiện tại: [ Công nghệ thông tin ]                     │
│ Phòng ban mới *:   [ Khối Sản Phẩm & R&D                    ▾]  │
│ Chức vụ mới *:     [ Tech Lead                              ▾]  │
│ Trưởng phòng mới:  [ Trần Văn B - Lead R&D                  ]  │
│ Ngày hiệu lực *:   [ 01/08/2026                             ]  │
│ Lý do điều chuyển: [ Đáp ứng nhu cầu mở rộng dự án mới        ]  │
├─────────────────────────────────────────────────────────────────┤
│ Trình duyệt: (Trưởng phòng cũ/mới -> Giám đốc - 2 Cấp)          │
│                                     [ Hủy Bỏ ]  [ 📤 Trình Duyệt ]│
└─────────────────────────────────────────────────────────────────┘
```

### 🔹 Group C: Form Đề Xuất Điều Chỉnh Lương & Phụ Cấp (Salary Adjustment Modal - 3 Cấp Duyệt)
```text
┌─────────────────────────────────────────────────────────────────┐
│ 💰 Đề Xuất Tăng Lương & Phụ Cấp (Group C)                  [X] │
├─────────────────────────────────────────────────────────────────┤
│ Nhân viên được tăng lương: Nguyễn Văn An (NV001)                │
│ Mức lương cơ bản hiện tại:  15,000,000 VNĐ                      │
│ Mức lương cơ bản mới *:     [ 18,000,000                      ]  │
│ Hệ số lương chức vụ mới *:  [ 1.25                            ]  │
│ Phụ cấp cố định mới *:      [ 2,000,000 (Ăn trưa, đi lại)     ]  │
│ Ngày hiệu lực *:            [ 01/08/2026                      ]  │
│ Số phụ lục HĐLĐ *:          [ PLHĐ-2026/08/NV001              ]  │
├─────────────────────────────────────────────────────────────────┤
│ Trình duyệt: (Trưởng phòng -> HR Lead -> Giám đốc - 3 Cấp)       │
│                                     [ Hủy Bỏ ]  [ 📤 Trình Duyệt ]│
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 3. Wireframe Chi Tiết Tab Onboarding Checklist Phối Hợp Liên Phòng Ban

Tab này hiển thị tiến độ tiếp nhận nhân viên mới và cho phép **Lead các phòng ban (IT, Admin, HR) phân công (Assign/Delegate) hoặc tự đảm nhận task**:

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 🚀 Quy Trình Onboarding Nhân Viên Mới: Nguyễn Văn An (Mã NV: NV003)                   │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ Tiến độ chung: [✅ 1. Khởi tạo] ──> [🟡 2. Cấp TB & Tài khoản] ──> [⏳ 3. Chỗ ngồi] ──> [⏳ 4. Thử việc] │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 📋 Danh Sách Task Tiếp Nhận Liên Phòng Ban:                                           │
├───────────────────────┬───────────┬──────────────────────┬────────────┬────────┬───────┤
│ Nội Dung Task         │ Phòng Ban │ Người Thực Hiện      │ Hạn Chốt   │TrạngThái│ThaoTác│
├───────────────────────┼───────────┼──────────────────────┼────────────┼────────┼───────┤
│ 1. Ký HĐLĐ Thử việc   │ HR        │ Trần Thị B (HR Manager)│ 20/07/2026 │[✅ DONE]│ 👁️   │
│ 2. Cấp Laptop ThinkPad│ IT        │ [Phân công: IT Support ▾]| 22/07/2026 │[🟡 IN_PR]│👤 Assign│
│ 3. Tạo Email & Git    │ IT        │ Lead IT (Tự nhận task)│ 22/07/2026 │[✅ DONE]│ 👁️   │
│ 4. Cấp Thẻ Ra Vào Tòa Nhà│ Admin  │ Phạm Văn D (Admin)   │ 23/07/2026 │[⏳ PEND]│ 👤 Assign│
│ 5. Bố Trí Bàn Làm Việc│ Admin     │ Phạm Văn D (Admin)   │ 23/07/2026 │[⏳ PEND]│ 👤 Assign│
│ 6. Chỉ Định Mentor    │ Manager   │ Lê Hoàng C (Dev Lead)│ 25/07/2026 │[✅ DONE]│ 👁️   │
├───────────────────────┴───────────┴──────────────────────┴────────────┴────────┴───────┤
│ [ Nút Đánh Giá Đạt Thử Việc -> Chuyển Trạng Thái OFFICIAL chính thức ]                  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🚪 4. Wireframe Chi Tiết Tab Offboarding Bàn Giao Thôi Việc (3 Cấp Duyệt)

Tab này theo dõi quy trình xin thôi việc 3 cấp và thu hồi tài sản liên phòng ban trước khi quyết toán HĐLĐ:

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 🚪 Quy Trình Offboarding & Thanh Lý Hợp Đồng: Lê Hoàng Cường (Mã NV: NV007)            │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ Tiến độ duyệt đơn (3 Cấp): [✅ Trưởng phòng] ──> [✅ HR Lead] ──> [✅ Giám đốc (Đã duyệt)]│
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 📋 Checklist Thu Hồi Tài Sản & Khóa Tài Khoản Bàn Giao:                                │
├──────────────────────────────────────┬───────────┬──────────────────────┬──────────────┤
│ Danh Mục Thu Hồi Bàn Giao            │ Phòng Ban │ Trạng Thái Bàn Giao  │ Người Xác Nhận│
├──────────────────────────────────────┼───────────┼──────────────────────┼──────────────┤
│ 1. Thu hồi Laptop & Phụ kiện máy tính│ IT        │ [✅ Đã thu hồi]      │ IT Support   │
│ 2. Khóa Email, Slack & Thu hồi Git   │ IT        │ [✅ Đã khóa tài khoản]│ Lead IT      │
│ 3. Thu hồi Thẻ ra vào tòa nhà & Chìa khóa│ Admin  │ [✅ Đã thu hồi]      │ Admin Staff  │
│ 4. Bàn giao Hồ sơ Dự án & Mã nguồn   │ Manager   │ [✅ Đã nghiệm thu]   │ Dev Lead     │
│ 5. Quyết toán Tiền lương & Phép tồn  │ HR        │ [🟡 Đang tính toán]  │ HR Accountant│
├──────────────────────────────────────┴───────────┴──────────────────────┴──────────────┤
│ [ ⚡ Thực Hiện Quyết Toán Lương & Chuyển Trạng Thái TERMINATED (Hoàn tất thôi việc) ]   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```
