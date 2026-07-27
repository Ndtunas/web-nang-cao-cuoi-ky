# Sơ đồ Tuần tự 4 - Quy trình Đăng ký Nghỉ phép & Kiểm tra Số dư phép

Sơ đồ tuần tự mô tả chi tiết các bước nhân viên tạo yêu cầu đăng ký nghỉ phép, hệ thống tự động kiểm tra điều kiện ràng buộc số ngày xin nghỉ thực tế so với số dư phép năm còn lại của nhân sự (`annual_leave_balance`) trước khi thực hiện ghi nhận.

```mermaid
sequenceDiagram
    autonumber
    actor Emp as Nhân viên
    participant FE as Client (React Form)
    participant LC as LeaveController
    participant LS as LeaveService
    participant ER as EmployeeRepository
    participant LR as LeaveRequestRepository
    participant DB as PostgreSQL Database

    Emp->>FE: Chọn ngày nghỉ (3 ngày) & click "Gửi yêu cầu nghỉ phép"
    FE->>LC: POST /api/v1/leave-requests { startDate, endDate, totalDays: 3, reason: "..." }
    Note over LC: Xác thực JWT & lấy thông tin Employee đăng nhập
    
    LC->>LS: createLeaveRequest(employeeId, dto)
    LS->>ER: findOne({ id: employeeId })
    ER->>DB: SELECT id, annual_leave_balance FROM employees WHERE id = ...
    DB-->>ER: Trả về đối tượng Employee (Ví dụ: annualLeaveBalance = 2)
    ER-->>LS: Trả về Employee
    
    LS->>LS: Kiểm tra điều kiện ràng buộc: totalDays (3) > annualLeaveBalance (2)
    
    alt Vượt quá số ngày phép còn lại (Vi phạm ràng buộc)
        LS-->>LC: Ném lỗi BusinessException("error.leave.balance.insufficient")
        LC-->>FE: HTTP 400 Bad Request { success: false, errorCode: "ERR_LEAVE_BALANCE_INSUFFICIENT" }
        FE-->>Emp: Hiển thị cảnh báo: "Số ngày nghỉ phép năm vượt quá số dư hiện tại"
    else Hợp lệ (Ví dụ: annualLeaveBalance >= totalDays)
        LS->>LR: create(dto)
        LS->>LR: save(leaveRequest)
        LR->>DB: INSERT INTO leave_requests (...) VALUES (...) RETURNING id
        DB-->>LR: Trả về bản ghi mới tạo với ID
        LR-->>LS: Trả về leaveRequest
        LS-->>LC: Trả về leaveRequest
        LC-->>FE: HTTP 201 Created { success: true, data: leaveRequest }
        FE-->>Emp: Hiển thị thông báo gửi đơn phép thành công
    end
```
