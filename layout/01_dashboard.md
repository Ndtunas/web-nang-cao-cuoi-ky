# 01. Bố Cục Màn Hình Dashboard & Thống Kê (Dashboard Layout)

Màn hình **Dashboard** là trang đích sau khi đăng nhập, cung cấp cái nhìn tổng quan về tình hình nhân sự, chấm công và các nhiệm vụ cần xử lý trong ngày.

---

## 📐 Bố Cục Giao Diện Sơ Bộ (Wireframe Spec)

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ [Logo] Phenikaa HRM   │ [🔍 Tìm kiếm nhân viên...]                🌐 [VI / EN] 👤 Admin │
├───────────────────────┴────────────────────────────────────────────────────────────────┤
│ 📊 Tổng quan         │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │
│ 👥 Nhân sự           │  │ 👥 Tổng NV   │ │ ✅ Đang làm  │ │ ⏰ Nghỉ phép │ │ 👤 Tuyển mới │  │
│ ⏱ Timesheet          │  │     128      │ │     115      │ │      8       │ │      5       │  │
│ 📑 Phê duyệt (3)     │  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘  │
│ 🏢 Phòng ban         │                                                                  │
│ ⚙️ Cài đặt hệ thống  │  ┌─────────────────────────────────┐  ┌───────────────────────┐  │
│                      │  │ 📈 Biến Động Nhân Sự (Chart)    │  │ 🔔 Việc Cần Phê Duyệt │  │
│                      │  │                                 │  │ ‣ Đơn xin phép #102   │  │
│                      │  │  [Biểu đồ cột tuyển mới/nghỉ]   │  │ ‣ Timesheet tuần 29   │  │
│                      │  │                                 │  │ ‣ Đề xuất tăng lương  │  │
│                      │  └─────────────────────────────────┘  └───────────────────────┘  │
└──────────────────────┴──────────────────────────────────────────────────────────────────┘
```

---

## 🎨 Thành Phần Linh Kiện Ant Design (Components)

1. **Bộ thẻ chỉ số thống kê (`Card` + `Statistic`):**
   - **Tổng số nhân viên:** Icon `<TeamOutlined />` (Màu Indigo).
   - **Nhân viên đang làm việc:** Icon `<CheckCircleOutlined />` (Màu Xanh lá).
   - **Nghỉ phép hôm nay:** Icon `<ClockCircleOutlined />` (Màu Vàng hổ phách).
   - **Tuyển dụng mới tháng:** Icon `<UserAddOutlined />` (Màu Tím).
2. **Khung việc cần phê duyệt (`List` + `Badge`):**
   - Hiển thị danh sách các phiếu yêu cầu phê duyệt đang chờ người dùng hiện tại xử lý.
3. **Biểu đồ thống kê biến động nhân sự:**
   - Biểu đồ theo dõi số lượng nhân viên Onboarding và Offboarding theo từng tháng.
