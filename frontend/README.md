# Frontend - Hệ Thống Quản Lý Nhân Sự (HRM)

Mô-đun giao diện người dùng cho ứng dụng HRM, xây dựng bằng **React 19**, **Vite**, **Ant Design v6** và hỗ trợ đa ngôn ngữ **i18next** (Tiếng Việt / Tiếng Anh).

---

## Công Nghệ

| Thành phần | Chi tiết |
|---|---|
| Framework | React 19 |
| Bundler | Vite 8 |
| UI Library | Ant Design v6 + `@ant-design/icons` + `lucide-react` |
| i18n | `i18next` + `react-i18next` |
| Theme | Custom dark theme qua `ConfigProvider` |
| HTTP | Native `fetch` qua wrapper `services/http.js` |

---

## Cấu Trúc Thư Mục

```text
frontend/
├── src/
│   ├── components/           # 15 màn hình chính
│   │   ├── Dashboard.jsx
│   │   ├── EmployeeDirectory.jsx
│   │   ├── Onboarding.jsx
│   │   ├── Offboarding.jsx
│   │   ├── LeaveRequests.jsx
│   │   ├── Timesheets.jsx
│   │   ├── Attendance.jsx
│   │   ├── ApprovalCenter.jsx
│   │   ├── Payroll.jsx
│   │   ├── Projects.jsx
│   │   ├── SystemConfig.jsx
│   │   ├── AuditLogs.jsx
│   │   ├── NotificationBell.jsx
│   │   ├── AppModal.jsx
│   │   └── Login.jsx
│   ├── services/             # 16 service wrappers
│   │   ├── auth.service.js
│   │   ├── employees.service.js
│   │   ├── attendance.service.js
│   │   ├── leave-requests.service.js
│   │   ├── timesheets.service.js
│   │   ├── approvals.service.js
│   │   ├── onboarding.service.js
│   │   ├── offboarding.service.js
│   │   ├── payroll.service.js
│   │   ├── projects.service.js
│   │   ├── configs.service.js
│   │   ├── departments.service.js  # (planned)
│   │   ├── positions.service.js    # (planned)
│   │   ├── notifications.service.js
│   │   ├── audit-logs.service.js
│   │   ├── exports.service.js
│   │   ├── http.js
│   │   └── index.js          # Tổng hợp → `api` object
│   ├── locales/              # vi.json, en.json
│   ├── constants/            # roles.js, TAB_KEYS, ROLE_PERMISSIONS
│   ├── assets/               # Static assets
│   ├── App.jsx               # Root layout + routing tab
│   ├── i18n.js               # i18next config
│   ├── index.css             # Global styles
│   └── main.jsx              # Entry point
├── index.html
├── vite.config.js            # Proxy /api → localhost:8080
├── package.json
└── README.md
```

---

## Cài Đặt & Chạy

### 1. Cài dependencies
```bash
cd frontend
npm install
```

### 2. Chạy Development
```bash
npm run dev
```
Mặc định tại `http://localhost:5173`. Vite đã proxy `/api` → `localhost:8080`.

### 3. Production Build
```bash
npm run build       # Output → dist/
npm run preview     # Preview build locally
```

### 4. Lint
```bash
npm run lint        # oxlint
```

---

## Tiêu Chuẩn UI/UX & i18n

1. **Button title** phải ngắn gọn (1-3 từ): `Thêm mới`, `Phê duyệt`, `Từ chối`, `Lưu`.
2. **Tooltip** giải thích ngắn (≤ 20 từ).
3. **Không pha trộn Anh - Việt:**
   - Tiếng Việt: 100% tiếng Việt chuẩn doanh nghiệp.
   - Tiếng Anh: 100% tiếng Anh chuẩn doanh nghiệp.
4. **Modal**: Ưu tiên dùng `AppModal` wrapper thay vì `Modal` của Antd (đồng bộ theme).
5. **Tag/Status**: Dùng color maps thuần (vd `STATUS_COLORS = { PENDING: 'gold' }`) kết hợp với `t()` cho label.

---

## Routing & Phân Quyền

`App.jsx` dùng tab-based routing thay vì React Router. Mỗi tab có key trong `TAB_KEYS`:

```js
import { TAB_KEYS } from './constants/roles.js';
import { checkAccess } from './constants/roles.js';
```

`ROLE_PERMISSIONS` map giữa role và danh sách tab được phép truy cập:

| Role | Tabs |
|---|---|
| `ADMIN` | Dashboard, Employees, Projects, Timesheets, Approvals, Payroll, Config, Audit, Leave, Onboarding, Offboarding |
| `DIRECTOR` | Dashboard, Projects, Approvals, Payroll, Leave |
| `DEPT_LEAD` | Dashboard, Projects, Approvals, Timesheets, Leave |
| `EMPLOYEE` | Dashboard, Projects, Timesheets, MyRequests, Leave, Attendance |

---

## Service Pattern

Mỗi domain có một service file riêng trong `services/`, tổng hợp qua `services/index.js` thành object `api`:

```js
// Trong component
import { api } from '../api.js';
const data = await api.employees.getAll();

// Hoặc import trực tiếp (tree-shake tốt hơn)
import { employeesService } from '../services/employees.service.js';
const data = await employeesService.getAll();
```

`http.js` wrapper:
- Tự động gắn `Authorization: Bearer <token>` từ `localStorage`.
- Parse JSON response.
- Throw Error với `i18nKey` nếu backend trả về lỗi.

---

## Notifications UX

`NotificationBell` (góc phải header):
- Poll `/notifications` + `/notifications/unread-count` mỗi 5 giây.
- Click 1 thông báo → gọi callback `onNotificationClick` → chuyển sang tab APPROVALS + auto-open modal chi tiết yêu cầu tương ứng (dựa trên `referenceEntityId`).
- Nút "đánh dấu tất cả đã đọc".

---

## Theme

Dark glassmorphism theme được apply qua:
```jsx
<ConfigProvider
  theme={{ token: { colorPrimary: '#3b82f6', ... } }}
  locale={i18n.language === 'vi' ? viVN : enUS}
>
```
Font chính: hệ thống (`-apple-system`, `Segoe UI`...).