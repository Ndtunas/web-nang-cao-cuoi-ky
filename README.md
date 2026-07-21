# Hệ thống Quản Lý Nhân Sự (HRM)

Ứng dụng quản lý nhân sự với:

- **Frontend:** React
- **Backend:** Spring Boot (Singleton Service)
- **Đa ngôn ngữ:** i18n **Tiếng Việt / English** (mặc định: **Tiếng Việt**)

---

## Chức năng chính

- Quản lý thông tin nhân sự
- Hỗ trợ giao diện song ngữ Việt/Anh
- Kết nối frontend và backend qua API

---

## Công nghệ sử dụng

### Frontend
- React
- i18n (vi/en)

### Backend
- Spring Boot
- Service theo mô hình Singleton

---

## Cấu trúc dự án (tham khảo)

```text
web-nang-cao-cuoi-ky/
├─ frontend/    # React app
└─ backend/     # Spring Boot app
```

---

## Chạy dự án

### 1) Backend (Spring Boot)

```bash
cd backend
# Maven
./mvnw spring-boot:run
# hoặc Gradle (nếu dùng)
./gradlew bootRun
```

Backend mặc định chạy tại: `http://localhost:8080`

### 2) Frontend (React)

```bash
cd frontend
npm install
npm start
```

Frontend mặc định chạy tại: `http://localhost:3000`

---

## i18n

- Hỗ trợ 2 ngôn ngữ: `vi` và `en`
- Ngôn ngữ mặc định: `vi` (Tiếng Việt)

---

## Ghi chú

- Đảm bảo backend đã chạy trước khi thao tác các chức năng cần dữ liệu API.
- Cập nhật URL API phía frontend theo môi trường thực tế nếu cần.