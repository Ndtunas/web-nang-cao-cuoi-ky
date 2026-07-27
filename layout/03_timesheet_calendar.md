# 03. Bố Cục Màn Hình Khai Báo Timesheet Tuần & OT (Timesheet Layout)

Màn hình **Timesheet** giúp nhân viên ghi nhận số giờ làm việc thực tế cho từng dự án/công việc trong tuần và nộp lên luồng phê duyệt 2 cấp.

---

## 📐 Bố Cục Giao Diện Khai Timesheet Tuần (Weekly Grid Spec)

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ ⏱ Bảng Khai Báo Timesheet Tuần   [< Tuần 29 (15/07 - 21/07/2026) >]   [📤 Submit Tuần] │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ Trạng thái: [🟡 DRAFT (Bản nháp)]   | Tổng giờ tiêu chuẩn: 40h | Tổng giờ OT: 6h      │
├─────────────────┬──────────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬───────────────┤
│ Dự Án / Task    │ Loại Giờ │ T2  │ T3  │ T4  │ T5  │ T6  │ T7  │ CN  │ Tổng Cộng     │
├─────────────────┼──────────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼───────────────┤
│ HRM Project     │ NORMAL   │ 8.0 │ 8.0 │ 8.0 │ 8.0 │ 8.0 │ 0.0 │ 0.0 │ 40.0 giờ      │
│ HRM Mobile App  │ OT_WEEKDAY│ 2.0 │ 0.0 │ 2.0 │ 0.0 │ 0.0 │ 0.0 │ 0.0 │ 4.0 giờ       │
│ Bảo trì Server  │ OT_WEEKEND│ 0.0 │ 0.0 │ 0.0 │ 0.0 │ 0.0 │ 2.0 │ 0.0 │ 2.0 giờ       │
├─────────────────┴──────────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┼───────────────┤
│ [+ Thêm Dòng Khai Mới]                                      Tổng tuần:│ 46.0 giờ      │
└──────────────────────────────────────────────────────────────────────┴───────────────┘
```

---

## 🖼 Form Nhập Chi Tiết Dòng Khai Timesheet (`Popover` / `Modal`)

- **Chọn Dự Án:** Dropdown danh sách các dự án đang tham gia.
- **Chọn Công Việc (Task):** Dropdown các đầu mục task chuyên môn.
- **Chọn Loại Giờ Công (`WorkType`):**
  - `NORMAL` (Hành chính tiêu chuẩn - 8h/ngày)
  - `OT_WEEKDAY` (OT Ngày thường - Tự động nạp hệ số `1.5`)
  - `OT_WEEKEND` (OT Thứ 7/Chủ nhật - Tự động nạp hệ số `2.0`)
  - `OT_HOLIDAY` (OT Ngày Lễ/Tết - Tự động nạp hệ số `3.0`)
  - `NIGHT_SHIFT` (Làm ca đêm - Tự động nạp phụ cấp `+30%`)
- **Ghi chú mô tả công việc:** Input text mô tả chi tiết kết quả công việc trong ngày.
