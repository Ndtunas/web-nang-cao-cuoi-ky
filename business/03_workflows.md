# 03. Quy Trình Nghiệp Vụ, Thuật Toán & Sơ Đồ Hoạt Động (Workflows & Diagrams)

Tài liệu này mô tả chi tiết tất cả các luồng quy trình nghiệp vụ (**Sequence & Activity Diagrams cho Câu 3 trong đề thi**), bao gồm đầy đủ 100% các luồng từ `01_user_stories.md`.

---

## 🔍 1. Sơ Đồ Quy Trình Tự Động Lưu Vết Giao Dịch (Audit Logging Interceptor)

```text
[Người dùng phát lệnh: CREATE / UPDATE / DELETE / APPROVE / REJECT]
                                   │
                                   ▼
        [HTTP Interceptor / Middleware tự động chặn Request]
                                   │
                                   ▼
            [Lấy Thông tin Người dùng (actorId, role, IP, UserAgent)]
                                   │
                                   ▼
         [Đọc Trạng thái Dữ liệu Cũ trước khi ghi (oldData)]
                                   │
                                   ▼
              [Thực thi Thao tác Backend / CSDL thành công]
                                   │
                                   ▼
         [Đọc Trạng thái Dữ liệu Mới sau khi ghi (newData)]
                                   │
                                   ▼
    [Tự động tạo bản ghi `SystemAuditLog` bất biến (Immutable)]
                                   │
                                   ▼
      [Admin truy cập Dashboard Tra cứu Nhật ký & Diff View]
```

---

## ⚙️ 2. Bảng Tham Số Cấu Hình Hệ Số Giờ Công Động (Dynamic Parameters)

| Mã Cấu hình (`configKey`) | Tên Tham số | Giá trị Cấu hình Mặc định (Default) | Ý nghĩa Nghiệp vụ |
| :--- | :--- | :---: | :--- |
| `OT_RATE_WEEKDAY` | Hệ số OT Ngày thường | `1.5` | Hệ số nhân lương cho giờ OT ngày làm việc bình thường |
| `OT_RATE_WEEKEND` | Hệ số OT Ngày nghỉ tuần | `2.0` | Hệ số nhân lương cho giờ OT ngày Thứ 7 / Chủ nhật |
| `OT_RATE_HOLIDAY` | Hệ số OT Ngày Lễ / Tết | `3.0` | Hệ số nhân lương cho giờ OT ngày nghỉ Lễ/Tết |
| `NIGHT_SHIFT_BONUS` | Phụ cấp ca đêm | `0.3` (30%) | Phụ cấp cộng thêm cho giờ làm việc ca đêm |
| `STANDARD_WORK_DAYS_MONTH` | Số ngày công tiêu chuẩn / tháng | `22` | Số ngày công quy định trong 1 tháng |
| `STANDARD_WORK_HOURS_DAY` | Số giờ làm tiêu chuẩn / ngày | `8` | Số giờ làm quy định trong 1 ngày làm việc |

---

## ⏱ 3. Sơ Đồ Quy Trình Khai Báo & Phê Duyệt Timesheet Tuần (Weekly Timesheet)

```text
[Nhân viên: Chọn Tuần -> Nhập giờ làm theo Ngày/Dự án/Công việc]
                               │
                               ▼
        [Nạp Động Hệ Số từ WorkRateConfig tương ứng với loại giờ]
                               │
                               ▼
            [Bấm Submit Timesheet (Trạng thái: SUBMITTED)]
                               │
                               ▼
             [Tự động tạo ApprovalRequest (2 Cấp duyệt)]
                               │
     ┌─────────────────────────┴─────────────────────────┐
     ▼                                                   ▼
[Cấp 1: Project Manager (PM) Duyệt]            [PM từ chối -> Nhập lý do]
(Kiểm tra giờ công đúng với dự án)                      │
     │                                                   ▼
     ▼                                       [Trả về cho Nhân viên sửa]
[Cấp 2: Trưởng phòng trực tiếp Duyệt]
     │
     ▼
[Trạng thái Timesheet: APPROVED] ──> [Đẩy Tổng giờ OT sang Bảng Lương Tháng]
```

---

## 🏛 4. Bảng Ma Trận Cấu Hình Phê Duyệt Đa Cấp (Approval Matrix)

| Loại Giao dịch (Transaction Type) | Mức độ Quan trọng | Số Cấp Duyệt | Trình tự Các Cấp Phê duyệt (Approval Sequence) |
| :--- | :--- | :---: | :--- |
| **Đơn nghỉ phép ngắn ngày ($\le 2$ ngày)** | Thấp | **1 Cấp** | **Level 2:** Trưởng phòng trực tiếp |
| **Đơn nghỉ phép dài ngày ($> 2$ ngày)** | Trung bình | **2 Cấp** | **Level 2:** Trưởng phòng trực tiếp $\rightarrow$ **Level 2:** HR Lead |
| **Khai Timesheet Tuần & OT** | Trung bình | **2 Cấp** | **Level 2:** PM Dự án $\rightarrow$ **Level 2:** Trưởng phòng |
| **Cập nhật Thông tin cá nhân (Group A)** | Thấp | **1 Cấp** | **Level 2:** HR Lead |
| **Điều chuyển Công tác (Group B)** | Trung bình | **2 Cấp** | **Level 2:** Trưởng phòng cũ/mới $\rightarrow$ **Level 3:** Giám đốc |
| **Tăng lương / Điều chỉnh Phụ cấp (Group C)**| Cao | **3 Cấp** | **Level 2:** Trưởng phòng $\rightarrow$ **Level 2:** HR Lead $\rightarrow$ **Level 3:** Giám đốc |
| **Offboarding / Chấm dứt HĐLĐ / Thôi việc** | Cao | **3 Cấp** | **Level 2:** Trưởng phòng $\rightarrow$ **Level 2:** HR Lead $\rightarrow$ **Level 3:** Giám đốc |
| **Chốt Bảng Lương Tháng (Payroll)** | Rất Cao | **2 Cấp** | **Level 2:** HR Lead $\rightarrow$ **Level 3:** Giám đốc |
| **Điều chỉnh Ngân sách Doanh nghiệp / C-Level**| Đặc biệt cao | **4 Cấp** | **Level 2:** HR Lead $\rightarrow$ **Level 3:** Giám đốc $\rightarrow$ **Level 4:** Chủ tịch |

---

## 🔄 5. Sơ Đồ Thuật Toán Phê Duyệt Đa Cấp (Multi-Level Approval State Machine)

```text
[Nhân viên / HR gửi Yêu cầu] ──> [Khởi tạo ApprovalRequest (CurrentLevel = 1)]
                                                     │
                                                     ▼
                                     [Gửi Notification tới Approver Cấp 1]
                                                     │
                                           ┌─────────┴─────────┐
                                     (Level 1 Approve)    (Level 1 Reject)
                                           │                   │
                                           ▼                   ▼
                               [Kiểm tra: Còn Cấp kế?]     [Trạng thái: REJECTED]
                                 ┌─────────┴─────────┐     [Bắn thông báo lý do]
                               (Còn)               (Hết)
                                 │                   │
                                 ▼                   ▼
                     [CurrentLevel++]         [Trạng thái: APPROVED]
                     [Bắn Noti Cấp 2]         [Kích hoạt hiệu lực Giao dịch]
```

---

## 🚀 6. Sơ Đồ Quy Trình Onboarding Tiếp Nhận Nhân Viên Mới Phối Hợp Liên Phòng Ban

```text
[HR Manager: Tạo thông tin Onboarding NV mới]
                     │
                     ├───────────────────────────────────────────────────────┐
                     ▼                                                       ▼
        [Tự động tạo Task HR]                                 [Tự động tạo Ticket IT & Admin]
(Thu hồ sơ, ký HĐLĐ, mã số thuế)                                            │
                     │                                                       ▼
                     ▼                                           [Lead IT nhận Notification]
              [HR hoàn tất]                                                  │
                                                         ┌───────────────────┴───────────────────┐
                                                         ▼                                       ▼
                                              (Phân công cho IT Support)               (Lead IT tự nhận task)
                                                         │                                       │
                                                         └───────────────────┬───────────────────┘
                                                                             │
                                                                             ▼
                                                                  [Cấp máy tính, Email, Git]
                                                                             │
                                                                             ▼
                                                                [Cập nhật Task: COMPLETED]
                                                                             │
                                                                             ▼
                                                                [Tự động báo về HR Manager]
                                                                             │
                                                                             ▼
                                                               [Chuyển trạng thái: PROBATION]
```

---

## 🚪 7. Sơ Đồ Quy Trình Offboarding & Thanh Lý Hợp Đồng (3 Cấp Duyệt)

```text
[Nhân viên nộp Đơn xin thôi việc] ──> [Duyệt 3 Cấp: Trưởng phòng -> HR Lead -> Giám đốc]
                                                       │
                                                       ▼
                                     [Bắn Ticket Thu hồi cho IT & Admin]
                                                       │
                                   ┌───────────────────┼───────────────────┐
                                   ▼                   ▼                   ▼
                            [IT Thu hồi máy,    [Admin thu hồi      [Trưởng phòng nhận
                             khóa Email/Git]     thẻ ra vào, tủ]    bàn giao dự án]
                                   └───────────────────┬───────────────────┘
                                                       │
                                                       ▼
                                            [Chốt bảng quyết toán]
                                                       │
                                                       ▼
                                      [Chuyển trạng thái: TERMINATED]
```

---

## 🔀 8. Sơ Đồ Quy Trình Điều Chuyển Công Tác (Job Transfer - 2 Cấp Duyệt)

```text
[HR Manager: Khởi tạo Yêu cầu Điều chuyển Nhân viên]
                      │
                      ▼
[Hệ thống sinh ApprovalRequest: Trưởng phòng cũ/mới (Cấp 1) -> Giám đốc (Cấp 2)]
                      │
                      ▼
  ┌───────────────────┴───────────────────┐
  ▼                                       ▼
[Cấp 1: Trưởng phòng Duyệt]       [Cấp 1: Từ chối] ──> [Hủy Yêu cầu]
  │
  ▼
[Cấp 2: Giám đốc Duyệt] ──> [Đến ngày hiệu lực: Tự động đổi phòng ban & lưu JobHistory]
```

---

## 💰 9. Sơ Đồ Quy Trình Điều Chỉnh Lương & Phụ Cấp (Salary Adjustment - 3 Cấp Duyệt)

```text
[HR Manager: Khởi tạo Yêu cầu Tăng lương / Phụ cấp]
                      │
                      ▼
[Hệ thống sinh ApprovalRequest: Trưởng phòng (Cấp 1) -> HR Lead (Cấp 2) -> Giám đốc (Cấp 3)]
                      │
                      ▼
[Khi Duyệt Cấp 3 (Giám đốc)] ──> [Hệ thống lưu vết vào SalaryHistory & áp dụng mức lương mới]
```

---

## 🧮 10. Thuật Toán & Công Thức Tính Lương Nạp Động Tham Số

$$\text{Net Salary} = \text{Lương Ngày Công} + \text{Tiền Làm Ngoài Giờ (OT Pay)} + \text{Phụ Cấp} - \text{Khấu Trừ} + \text{Trợ Cấp Quyết Toán}$$

$$\text{Lương Giờ Tiêu Chuẩn} = \frac{\text{Lương Cơ Bản} \times \text{Hệ Số Chức Vụ}}{\text{WorkRateConfig.getValue('STANDARD\_WORK\_DAYS\_MONTH')} \times \text{WorkRateConfig.getValue('STANDARD\_WORK\_HOURS\_DAY')}}$$

$$\begin{aligned}
\text{OT Pay} = \text{Lương Giờ Tiêu Chuẩn} \times \Big( 
& \text{OT\_WEEKDAY\_HOURS} \times \text{WorkRateConfig.getValue('OT\_RATE\_WEEKDAY')} \\
+ & \text{OT\_WEEKEND\_HOURS} \times \text{WorkRateConfig.getValue('OT\_RATE\_WEEKEND')} \\
+ & \text{OT\_HOLIDAY\_HOURS} \times \text{WorkRateConfig.getValue('OT\_RATE\_HOLIDAY')} \\
+ & \text{NIGHT\_HOURS} \times \text{WorkRateConfig.getValue('NIGHT\_SHIFT\_BONUS')} 
\Big)
\end{aligned}$$
