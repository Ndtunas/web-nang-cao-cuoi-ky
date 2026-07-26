# Sequence Diagram 5 - Delete Entity & Cascading Flow

This diagram details the deletion of a Department, illustrating how NestJS checks for existing employees, executes the delete query, and how foreign keys or soft associations handle cascading relationships.

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Quản trị viên (Admin)
    participant FE as Client (React UI)
    participant DeptC as DepartmentsController
    participant DeptS as DepartmentsService
    participant EmpR as EmployeeRepository
    participant DeptR as DepartmentRepository
    participant DB as PostgreSQL Database

    Admin->>FE: Bấm nút "Xóa" một phòng ban (ID: 73242549581516922)
    FE->>FE: Hiển thị hộp thoại cảnh báo xác nhận xóa (SweetAlert2)
    Admin->>FE: Chọn "Xác nhận xóa"
    FE->>DeptC: DELETE /api/v1/departments/73242549581516922
    Note over DeptC: RolesGuard kiểm tra quyền Admin
    
    DeptC->>DeptS: remove(departmentId)
    
    DeptS->>EmpR: count({ departmentId })
    EmpR->>DB: SELECT COUNT(*) FROM employees WHERE department_id = 73242549581516922;
    DB-->>EmpR: Trả về số lượng nhân viên còn trực thuộc (ví dụ: count = 0)
    EmpR-->>DeptS: Trả về count = 0
    
    alt Vẫn còn nhân viên trực thuộc phòng
        Note over DeptS: Không cho phép xóa trực tiếp phòng ban đang có nhân sự
        DeptS-->>DeptC: Ném BusinessException("error.department.has.employees")
        DeptC-->>FE: HTTP 400 Bad Request { success: false, errorCode: "ERR_DEPT_HAS_EMPLOYEES" }
        FE-->>Admin: Hiển thị lỗi "Phòng ban này vẫn đang chứa nhân viên, không thể xóa!"
    else Không còn nhân viên trực thuộc
        DeptS->>DeptR: delete(departmentId)
        DeptR->>DB: DELETE FROM departments WHERE id = 73242549581516922;
        Note over DB: PostgreSQL kiểm tra ràng buộc khóa ngoại (Foreign Keys).<br/>Nếu có bảng liên quan cấu hình ON DELETE CASCADE,<br/>các bản ghi liên quan (như dự án con) sẽ tự động bị xóa theo.
        DB-->>DeptR: Trả về số dòng bị ảnh hưởng (1 row deleted)
        DeptR-->>DeptS: Xác nhận xóa thành công
        DeptS-->>DeptC: Trả về kết quả xóa
        DeptC-->>FE: HTTP 200 OK { success: true, message: "Department deleted successfully" }
        FE->>FE: Xóa phòng ban khỏi State, Render lại giao diện danh sách phòng ban
        FE-->>Admin: Hiển thị thông báo "Xóa phòng ban thành công"
    end
```
