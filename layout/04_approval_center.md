# 04. Bố Cục Màn Hình Trung Tâm Phê Duyệt Đa Cấp (Approval Center Layout)

Màn hình **Trung Tâm Phê Duyệt Đa Cấp** cung cấp giao diện xử lý các phiếu yêu cầu (Đơn phép, Timesheet, Điều chuyển, Tăng lương, Offboarding) cho Trưởng phòng, Giám đốc và Chủ tịch.

---

## 📐 Bố Cục Giao Diện Danh Sách Phiếu Chờ Duyệt (Pending Approvals)

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 📑 Trung Tâm Phê Duyệt Đa Cấp                                                          │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [Đang Chờ Tôi Duyệt (3)]   [Tôi Đã Duyệt (12)]   [Yêu Cầu Tôi Đã Gửi (5)]                 │
├───────┬──────────────────────┬──────────────────┬─────────────┬─────────────┬──────────┤
│ Mã YC │ Loại Giao Dịch       │ Người Yêu Cầu    │ Cấp Hiện Tại│ Trạng Thái  │Thao tác  │
├───────┼──────────────────────┼──────────────────┼─────────────┼─────────────┼──────────┤
│ REQ101│ Tăng Lương (Group C) │ Nguyễn Văn An    │ Cấp 2 / 3   │ [🟡 PENDING]│ 🔍 ✅ ❌ │
│ REQ102│ Đơn Nghỉ Phép Dài Ngày│ Trần Thị Bình   │ Cấp 1 / 2   │ [🟡 PENDING]│ 🔍 ✅ ❌ │
│ REQ103│ Offboarding          │ Lê Hoàng Cường   │ Cấp 3 / 3   │ [🟡 PENDING]│ 🔍 ✅ ❌ │
└───────┴──────────────────────┴──────────────────┴─────────────┴─────────────┴──────────┘
```

---

## 🖼 Khung Theo Dõi Tiến Độ Phê Duyệt Đa Cấp Realtime (`Steps` + `Timeline`)

Khi bấm nút **Xem chi tiết 🔍**, màn hình sẽ hiển thị thanh tiến độ cấp duyệt:

```text
┌─────────────────────────────────────────────────────────────────┐
│ 🔍 Chi Tiết Phiếu Yêu Cầu #REQ101 - Điều Chỉnh Lương           │
├─────────────────────────────────────────────────────────────────┤
│ Người yêu cầu: Nguyễn Văn An (Mã NV: NV001)                     │
│ Nội dung: Đề xuất tăng Lương cơ bản từ 15tr -> 18tr (Hiệu lực 08/2026) │
├─────────────────────────────────────────────────────────────────┤
│ Tiến độ Phê duyệt (3 Cấp):                                      │
│                                                                 │
│   (✅ Cấp 1: Trưởng phòng) ──> (✅ Cấp 2: HR Lead) ──> (🟡 Cấp 3: Giám đốc) │
│   Đã duyệt 15/07 10:30        Đã duyệt 15/07 14:00     Đang chờ duyệt │
├─────────────────────────────────────────────────────────────────┤
│ Ghi chú phê duyệt: [Nhập ghi chú ý kiến nếu có...            ] │
│                                                                 │
│                     [ ❌ Từ Chối ]    [ ✅ Phê Duyệt Cấp Này ] │
└─────────────────────────────────────────────────────────────────┘
```
