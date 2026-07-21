# 06. Bố Cục Màn Hình Cấu Hình Hệ Thống Động (System Configurations Layout)

Màn hình này cho phép Admin và HR Manager cấu hình động **Bảng Tham Số Hệ Số Giờ Công & Tỷ Lệ OT (`WorkRateConfig`)** và **Ma Trận Cấu Hình Phê Duyệt Đa Cấp (`ApprovalConfig`)** trên giao diện mà không hardcode.

---

## 📐 1. Bố Cục Giao Diện Cấu Hình Hệ Số Giờ Công Động (`WorkRateConfig`)

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ ⚙️ Cấu Hình Bảng Tham Số Hệ Số Giờ Công & Tỷ Lệ OT Động (WorkRateConfig)              │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 💡 Lưu ý: Thay đổi các hệ số này sẽ tự động áp dụng vào thuật toán tính lương tháng.    │
├────────────────────────────┬──────────────────┬──────────────┬─────────────┬───────────┤
│ Mã Tham Số (`configKey`)   │ Tên Tham Số      │ Giá Trị Mới  │ Trạng Thái  │ Thao Tác  │
├────────────────────────────┼──────────────────┼──────────────┼─────────────┼───────────┤
│ OT_RATE_WEEKDAY            │ Hệ số OT Ngày thường │ [ 1.5 ]      │ [ACTIVE]    │ 💾 Lưu   │
│ OT_RATE_WEEKEND            │ Hệ số OT Ngày nghỉ tuần│ [ 2.0 ]    │ [ACTIVE]    │ 💾 Lưu   │
│ OT_RATE_HOLIDAY            │ Hệ số OT Ngày Lễ/Tết │ [ 3.0 ]      │ [ACTIVE]    │ 💾 Lưu   │
│ NIGHT_SHIFT_BONUS          │ Phụ cấp làm ca đêm │ [ 0.30 ] (30%)│ [ACTIVE]    │ 💾 Lưu   │
│ STANDARD_WORK_DAYS_MONTH   │ Ngày công tiêu chuẩn/tháng│ [ 22 ]   │ [ACTIVE]    │ 💾 Lưu   │
│ STANDARD_WORK_HOURS_DAY    │ Giờ tiêu chuẩn/ngày│ [ 8 ]       │ [ACTIVE]    │ 💾 Lưu   │
└────────────────────────────┴──────────────────┴──────────────┴─────────────┴───────────┘
```

---

## 📐 2. Bố Cục Giao Diện Cấu Hình Ma Trận Duyệt Đa Cấp (`ApprovalConfig`)

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 🏛 Ma Trận Duyệt Đa Cấp Cho Các Loại Giao Dịch (Approval Matrix Config)                │
├───────────────────────────────────────────────────────┬──────────────┬─────────────────┤
│ Loại Giao Dịch (`TransactionType`)                    │ Số Cấp Duyệt │ Trình Tự Cấp    │
├───────────────────────────────────────────────────────┼──────────────┼─────────────────┤
│ Đơn nghỉ phép ngắn ngày (<= 2 ngày)                   │ [ 1 Cấp ▾ ]  │ Trưởng phòng    │
│ Đơn nghỉ phép dài ngày (> 2 ngày)                     │ [ 2 Cấp ▾ ]  │ Trưởng phòng -> HR Lead │
│ Khai Timesheet Tuần & OT                              │ [ 2 Cấp ▾ ]  │ PM Dự án -> Trưởng phòng │
│ Thay đổi thông tin cá nhân (Group A)                  │ [ 1 Cấp ▾ ]  │ HR Lead         │
│ Điều chuyển công tác (Group B)                        │ [ 2 Cấp ▾ ]  │ Trưởng phòng -> Giám đốc │
│ Tăng lương & Phụ cấp (Group C)                        │ [ 3 Cấp ▾ ]  │ TP -> HR Lead -> Giám đốc │
│ Offboarding / Thôi việc                               │ [ 3 Cấp ▾ ]  │ TP -> HR Lead -> Giám đốc │
│ Chốt Bảng lương tháng (Payroll)                       │ [ 2 Cấp ▾ ]  │ HR Lead -> Giám đốc │
└───────────────────────────────────────────────────────┴──────────────┴─────────────────┘
```
