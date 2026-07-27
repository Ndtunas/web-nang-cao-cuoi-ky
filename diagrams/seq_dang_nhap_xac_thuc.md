# Sơ đồ Tuần tự 1 - Quy trình Đăng nhập & Xác thực Tài khoản

Sơ đồ này mô tả chi tiết quy trình người dùng đăng nhập vào hệ thống, hệ thống xác thực thông tin tài khoản và trả về cặp mã token JWT (Access Token & Refresh Token) để sử dụng cho các yêu cầu nghiệp vụ tiếp theo.

```mermaid
sequenceDiagram
    autonumber
    actor User as Người dùng
    participant FE as Client (React Frontend)
    participant AuthC as AuthController (NestJS)
    participant AuthS as AuthService
    participant UserR as UserRepository
    participant DB as PostgreSQL Database

    User->>FE: Nhập username & password + click "Đăng nhập"
    FE->>AuthC: POST /api/v1/auth/login { username, password }
    AuthC->>AuthS: login(username, password)
    AuthS->>UserR: findByUsername(username)
    UserR->>DB: SELECT * FROM users WHERE username = ...
    DB-->>UserR: Trả về User Entity & passwordHash
    UserR-->>AuthS: Trả về đối tượng User
    AuthS->>AuthS: So sánh mật khẩu bằng bcrypt.compare()
    alt Mật khẩu không chính xác hoặc User không hoạt động
        AuthS-->>AuthC: Ném lỗi UnauthorizedException (i18n)
        AuthC-->>FE: HTTP 401 Unauthorized { success: false, error: ... }
        FE-->>User: Hiển thị thông báo sai thông tin tài khoản
    else Thông tin hợp lệ
        AuthS->>AuthS: Tạo Access Token (JWT - hết hạn sau 24h)
        AuthS->>AuthS: Tạo Refresh Token (JWT)
        AuthS->>UserR: Lưu refresh token hash vào CSDL
        UserR->>DB: UPDATE users SET refresh_token = ... WHERE id = ...
        DB-->>UserR: Xác nhận lưu thành công
        AuthS-->>AuthC: Trả về { accessToken, user }
        AuthC-->>FE: HTTP 201 Created { success: true, data: { accessToken, user } }
        FE->>FE: Lưu token vào Context & LocalStorage / Cookies
        FE-->>User: Chuyển hướng sang màn hình Dashboard
    end

    Note over FE, DB: Các Request tiếp theo (Ví dụ: Lấy danh sách nhân viên)
    User->>FE: Truy cập trang Danh sách nhân viên
    FE->>AuthC: GET /api/v1/employees (Header: Authorization: Bearer <token>)
    AuthC->>AuthC: JwtAuthGuard giải mã & xác thực token
    alt Token hết hạn hoặc không hợp lệ
        AuthC-->>FE: HTTP 401 Unauthorized (Trigger Refresh Token flow)
    else Token hợp lệ
        AuthC-->>FE: HTTP 200 OK { success: true, data: [...] }
    end
```
