# Frontend - Hệ Thống Quản Lý Nhân Sự (HRM System)

Mô-đun giao diện người dùng (Frontend) cho ứng dụng Quản Lý Nhân Sự (HRM), được xây dựng bằng **React**, **Vite**, **Ant Design (`antd`)** và hỗ trợ đa ngôn ngữ **i18n** (Tiếng Việt / Tiếng Anh).

---

## 🚀 Công Nghệ Sử Dụng

- **Framework:** React 19 + Vite
- **UI Component Library:** Ant Design (`antd` v5) + `@ant-design/icons`
- **Đa Ngôn Ngữ (i18n):** `i18next` + `react-i18next` (Mặc định: **Tiếng Việt `vi`**, hỗ trợ chuyển đổi sang **Tiếng Anh `en`**)
- **Icons:** `@ant-design/icons` & `lucide-react`
- **Theme:** Ant Design Dark Theme Customization (`ConfigProvider`)

---

## 🎨 Quy Tắc Thiết Kế UI/UX & Chuẩn Đa Ngôn Ngữ (UI/UX & Localization Standards)

1. **Tiêu đề trên Button (`Button Title`):** Phải ngắn gọn, súc tích (chỉ từ 1 - 3 từ; ví dụ: `Thêm mới`, `Trình duyệt`, `Phê duyệt`, `Từ chối`, `Lưu`, `Xem khác biệt`, `Chốt lương`).
2. **Chú thích Tooltip bổ sung (`Tooltip`):** Sử dụng linh kiện `Tooltip` của Ant Design để giải thích ngắn gọn ý nghĩa hành động khi di chuột (Hover), độ dài tooltip súc tích, vừa phải (không quá 15-20 từ).
3. **🌐 Không pha trộn Anh - Việt (Strict Language Consistency):**
   - **Giao diện Tiếng Việt (`vi`):** 100% Tiếng Việt chuẩn mực doanh nghiệp (VD: `Xem khác biệt` thay vì `Xem Diff`, `Nộp tuần` thay vì `Submit tuần`, `Chờ tôi duyệt` thay vì `Pending my level`).
   - **Giao diện Tiếng Anh (`en`):** 100% Tiếng Anh chuẩn doanh nghiệp (VD: `View Diff`, `Submit Week`, `Pending My Approval`).

---

## 📁 Cấu Trúc Thư Mục

```text
frontend/
├── src/
│   ├── assets/          # Hình ảnh & tài nguyên tĩnh
│   ├── locales/         # File từ điển đa ngôn ngữ (vi.json & en.json)
│   ├── App.jsx          # Giao diện chính HRM (Header, Sidebar, Stats, Table, Modal)
│   ├── index.css        # Custom CSS, Glassmorphism & Layout styling
│   ├── i18n.js          # Cấu hình đa ngôn ngữ (Việt / Anh)
│   └── main.jsx         # Entry point tích hợp i18n & React DOM
├── index.html           # HTML template
├── vite.config.js       # Cấu hình Vite bundler
├── package.json         # Khai báo phụ thuộc & npm scripts
└── README.md            # Tài liệu hướng dẫn mô-đun Frontend
```

---

## 🛠 Hướng Dẫn Cài Đặt & Chạy Ứng Dụng

### 1. Cài đặt dependencies
Chạy lệnh sau tại thư mục `frontend`:

```bash
cd frontend
npm install
```

### 2. Chạy môi trường Development
```bash
npm run dev
```

Ứng dụng sẽ chạy mặc định tại địa chỉ: `http://localhost:5173` (hoặc cổng hiển thị trong terminal).

### 3. Kiểm tra Build sản phẩm (Production)
```bash
npm run build
```

Mã nguồn sau khi nén & tối ưu sẽ nằm trong thư mục `dist/`.

---

## ✨ Chức Năng Nổi Bật Phía Frontend

1. **Giao Diện Quản Lý Nhân Sự Hiện Đại:**
   - Bộ chỉ số thống kê tổng quan (Tổng nhân viên, Đang làm việc, Nghỉ phép, Tuyển mới).
   - Bảng danh sách nhân viên Ant Design tích hợp phân trang, thẻ trạng thái (`Tag`) và nút thao tác Chỉnh sửa/Xóa.
   - Thanh tìm kiếm thời gian thực theo Mã NV, Họ tên hoặc Phòng ban.
2. **Form Thêm / Chỉnh Sửa Nhân Viên & Form Modals 4 Nhóm Thay Đổi:**
   - Modal hiển thị form Ant Design hỗ trợ xác thực dữ liệu đầu vào (Validation).
3. **Chuyển Đổi Đa Ngôn Ngữ Thuần Nhất (Việt / Anh):**
   - Tích hợp nút chuyển đổi ngôn ngữ nhanh trên Header, đồng bộ giữa `i18next` và `ConfigProvider` của Ant Design, không lộn xộn từ ngữ Anh-Việt.
