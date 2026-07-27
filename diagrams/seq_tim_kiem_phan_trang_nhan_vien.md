# Sơ đồ Tuần tự 2 - Quy trình Tìm kiếm & Phân trang danh sách Nhân viên

Sơ đồ tuần tự mô tả chi tiết quy trình người dùng tìm kiếm, lọc dữ liệu nhân sự (theo tên, phòng ban) và chuyển trang trên giao diện hiển thị, cách backend xử lý các tham số truy vấn và biên dịch câu lệnh SQL để truy xuất dữ liệu từ cơ sở dữ liệu.

```mermaid
sequenceDiagram
    autonumber
    actor User as Người dùng / Quản trị viên
    participant FE as Client (React Table)
    participant EmpC as EmployeesController
    participant EmpS as EmployeesService
    participant EmpR as EmployeeRepository
    participant DB as PostgreSQL Database

    User->>FE: Nhập từ khóa tìm kiếm "Trần" & chọn Phòng "IT" & bấm trang 2
    FE->>EmpC: GET /api/v1/employees?page=2&limit=10&search=Trần&departmentId=73242549581516922
    Note over EmpC: JwtAuthGuard & RolesGuard xác thực quyền truy cập của User
    
    EmpC->>EmpS: findAll({ page: 2, limit: 10, search: 'Trần', departmentId: '...' })
    EmpS->>EmpS: Tính toán offset = (page - 1) * limit (ví dụ: offset = 10)
    EmpS->>EmpR: createQueryBuilder('employee')
    
    Note over EmpR: TypeORM thiết lập điều kiện:<br/>- Where full_name LIKE '%Trần%'<br/>- And department_id = departmentId<br/>- Skip(10) Take(10)
    
    EmpR->>DB: SELECT * FROM employees WHERE full_name ILIKE '%Trần%' AND department_id = ... LIMIT 10 OFFSET 10;
    DB-->>EmpR: Trả về danh sách 10 bản ghi phù hợp
    
    EmpR->>DB: SELECT COUNT(*) FROM employees WHERE full_name ILIKE '%Trần%' AND department_id = ...;
    DB-->>EmpR: Trả về tổng số bản ghi (ví dụ: total = 25)
    
    EmpR-->>EmpS: Trả về [entities, totalCount]
    
    EmpS->>EmpS: Định dạng kết quả phân trang:<br/>{ data: entities, meta: { total, page, lastPage } }
    EmpS-->>EmpC: Trả về đối tượng phân trang
    
    EmpC-->>FE: HTTP 200 OK { success: true, data: { items: [...], total: 25, page: 2 } }
    FE->>FE: Cập nhật State, Render lại bảng danh sách nhân viên
    FE-->>User: Hiển thị danh sách nhân viên trang 2 khớp điều kiện lọc
```
