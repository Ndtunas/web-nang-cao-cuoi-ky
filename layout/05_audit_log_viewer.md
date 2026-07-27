# 05. Bố Cục Màn Hình Nhật Ký Lưu Vết Giao Dịch Admin (Audit Log Viewer Layout)

Màn hình **Audit Log Viewer** dành riêng cho Quản trị viên (System Admin) để tra cứu nhật ký lịch sử tất cả các thao tác, giao dịch trên hệ thống và so sánh dữ liệu Trước vs. Sau (Diff View).

---

## 📐 Bố Cục Giao Diện Nhật Ký Lưu Vết (Audit Trail Spec)

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 🛡️ Nhật Ký Lưu Vết Giao Dịch Toàn Hệ Thống (System Audit Log)                        │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ Bộ lọc: [📅 Từ ngày - Đến ngày]  [Tài khoản: Tất cả ▾]  [Hành động: Tất cả ▾]  [Thực thể ▾] │
├─────────────────────┬──────────────────┬──────────────┬──────────────────┬─────────────┤
│ Thời Gian           │ Người Thực Hiện  │ Hành Động    │ Đối Tượng Bị Sửa │ Thao Tác    │
├─────────────────────┼──────────────────┼──────────────┼──────────────────┼─────────────┤
│ 21/07/2026 15:30:12 │ admin@company.com│ [UPDATE]     │ Salary (#SAL102) │ 🔍 Xem Diff │
│ 21/07/2026 14:15:00 │ hr@company.com   │ [APPROVE]    │ LeaveRequest#101 │ 🔍 Xem Diff │
│ 21/07/2026 10:00:45 │ lead.it@co.com   │ [CREATE]     │ OnboardingTask   │ 🔍 Xem Diff │
└─────────────────────┴──────────────────┴──────────────┴──────────────────┴─────────────┘
```

---

## 🖼 Modal So Sánh Khác Biệt Dữ Liệu Trước vs. Sau (Diff View Modal)

Khi Admin bấm nút **Xem Diff 🔍**, Modal sẽ hiển thị bảng so sánh cấu trúc dữ liệu JSON:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ 🔍 Chi Tiết Lưu Vết Thay Đổi - Bản Ghi #LOG_9012                     [X]│
├─────────────────────────────────────────────────────────────────────────┤
│ Người thao tác: hr@company.com | IP: 192.168.1.45 | Hành động: UPDATE   │
├────────────────────────────────────┬────────────────────────────────────┤
│ 🟥 Dữ Liệu Cũ (Before State)       │ 🟩 Dữ Liệu Mới (After State)        │
├────────────────────────────────────┼────────────────────────────────────┤
│ {                                  │ {                                  │
│   "id": "EMP001",                  │   "id": "EMP001",                  │
│   "status": "PROBATION",           │   "status": "OFFICIAL",            │
│   "baseSalary": 12000000           │   "baseSalary": 15000000           │
│ }                                  │ }                                  │
├────────────────────────────────────┴────────────────────────────────────┤
│ Thẻ tô màu: [🔴 Dữ liệu cũ bị xóa/thay thế]   [🟢 Dữ liệu mới được nạp]  │
└─────────────────────────────────────────────────────────────────────────┘
```
