# Sequence Diagram 4 - Update & Check Data Constraints Flow (Leave Balance Validation)

This diagram shows how a Leave Request submission checks the employee's remaining annual leave balance constraint before creating the record or updating the database.

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
