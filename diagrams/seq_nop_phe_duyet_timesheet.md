# Sơ đồ Tuần tự 3 - Quy trình Khai báo & Nộp phê duyệt Timesheet tuần

Sơ đồ tuần tự mô tả các bước nhân viên thực hiện nộp bảng chấm công tuần (Timesheet) dự án, hệ thống backend xử lý kiểm tra trạng thái hợp lệ, tự động khởi tạo phiếu yêu cầu phê duyệt đa cấp (`ApprovalRequest`) tương ứng và liên kết các thực thể trong cơ sở dữ liệu.

```mermaid
sequenceDiagram
    autonumber
    actor Emp as Nhân viên (Trần Thị Nhân Viên)
    participant FE as Client (React UI)
    participant TSC as TimesheetsController
    participant TSS as TimesheetsService
    participant TSR as TimesheetRepository
    participant ARR as ApprovalRequestRepository
    participant DB as PostgreSQL Database

    Emp->>FE: Bấm "Nộp phê duyệt" bảng công tuần
    FE->>TSC: PATCH /api/v1/timesheets/74917061582656171/submit
    Note over TSC: Xác thực quyền & Lấy thông tin user đăng nhập
    
    TSC->>TSS: submit(timesheetId, user.id)
    TSS->>TSR: findOne({ id: timesheetId })
    TSR->>DB: SELECT * FROM timesheets WHERE id = 74917061582656171
    DB-->>TSR: Trả về Timesheet Entity
    TSR-->>TSS: Trả về Timesheet
    
    TSS->>TSS: Kiểm tra trạng thái hiện tại (Phải là DRAFT)
    
    TSS->>ARR: create({ transactionType: 'TIMESHEET', referenceEntityId, requesterId, status: 'PENDING' })
    ARR-->>TSS: Khởi tạo thực thể ApprovalRequest (chưa có ID)
    
    TSS->>ARR: save(approvalReq)
    ARR->>DB: INSERT INTO approval_requests (transaction_type, ...) VALUES (...) RETURNING id
    Note over DB: Database thực thi `DEFAULT fn_generate_snowflake_id()` để gán ID mới
    DB-->>ARR: Trả về bản ghi mới tạo với ID (ví dụ: id = 74917061599999999)
    ARR-->>TSS: Trả về savedReq chứa ID mới sinh
    
    TSS->>TSS: Cập nhật thông tin timesheet:<br/>- status = 'PENDING_APPROVAL'<br/>- approvalRequestId = savedReq.id
    
    TSS->>TSR: save(timesheet)
    TSR->>DB: UPDATE timesheets SET status = 'PENDING_APPROVAL', approval_request_id = ... WHERE id = ...
    DB-->>TSR: Xác nhận cập nhật thành công
    TSR-->>TSS: Trả về timesheet cập nhật
    
    TSS-->>TSC: Trả về kết quả timesheet đã nộp
    TSC-->>FE: HTTP 200 OK { success: true, data: timesheet }
    FE->>FE: Hiển thị thông báo nộp thành công và đổi màu trạng thái sang "Chờ duyệt"
    FE-->>Emp: Giao diện hiển thị trạng thái mới
```
