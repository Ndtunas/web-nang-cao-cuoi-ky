# REVIEW_CHECKLIST.md — Hệ Thống HRM

> **Quy tắc vàng**: Mỗi khi code/sửa → mở file này → check theo nguồn spec tương ứng.

## 📑 Bản Đồ Spec Sources

| Mã | File | Nội dung |
|----|------|----------|
| **USR** | `business/01_user_stories.md` | 26 User Stories, 8 mô-đun, Approval Matrix |
| **DOM** | `business/02_domain_model.md` | 21 entities, methods, quan hệ, lifecycle |
| **WF**  | `business/03_workflows.md` | 10 sequence/activity, formulas, defaults |
| **API** | `business/04_architecture.md` | Layered architecture + 100% RESTful specs |
| **BV**  | `business/05_business_values.md` | Enums, validation, error codes, password rules |
| **DB**  | `database/02_tables_and_relationships.md` | 21 tables, FK, constraints |
| **UI**  | `layout/01..07_*.md` | Wireframes, i18n standards |
| **AUTH** | `testcase-checklist/auth-config-checklist.md` | 17 e2e tests |

---

## ✅ Checklist Khi Viết/Sửa Code

### 1. Enum & Constants (Ref: BV §1)

```
- [ ] Enum đúng key/value theo BV §1.1-1.10
- [ ] File: backend/src/common/enums/business-values.ts
- [ ] Tất cả user-facing string dùng enum, không hardcode
```

### 2. Error Codes (Ref: BV §4)

```
- [ ] Error code có trong business.exception.ts map
- [ ] Format response: { statusCode, errorCode, i18nKey, params, timestamp }
- [ ] Tương ứng i18n key có trong frontend/src/locales/{vi,en}.json
```

| Code | i18nKey | HTTP |
|------|---------|------|
| ERR_AUTH_001 | error.auth.invalidCredentials | 401 |
| ERR_AUTH_002 | error.auth.accessDenied | 403 |
| ERR_AUTH_003 | error.auth.userNotFound | 404 |
| ERR_EMP_001 | error.employee.codeOrEmailExists | 400 |
| ERR_EMP_002 | error.employee.cannotTransferNoticePeriod | 400 |
| ERR_LEAVE_001 | error.leave.insufficientBalance | 400 |
| ERR_LEAVE_002 | error.leave.invalidDateRange | 400 |
| ERR_LEAVE_003 | error.leave.cannotCancel | 400 |
| ERR_APPROVAL_001 | error.approval.unauthorizedLevel | 403 |
| ERR_APPROVAL_002 | error.approval.alreadyRejected | 400 |
| ERR_APPROVAL_003 | error.approval.requestNotFound | 404 |
| ERR_APPROVAL_004 | error.approval.invalidRequestData | 400 |
| ERR_TIMESHEET_001 | error.timesheet.alreadyApproved | 400 |
| ERR_TIMESHEET_003 | error.timesheet.noEntriesToSubmit | 400 |
| ERR_PAYROLL_001 | error.payroll.alreadyFinalized | 400 |

### 3. Validation Rules (Ref: BV §3)

```
- [ ] empCode: ^NV[0-9]{5}$ (DB sẽ sinh, nhưng DTO nên có nếu FE nhập)
- [ ] email: ^[a-zA-Z0-9._%+-]+@company\.com$
- [ ] password: min 8, 1 upper, 1 lower, 1 digit, 1 special
- [ ] phone: ^(0[3|5|7|8|9])[0-9]{8}$
- [ ] hoursSpent: 0.5 - 24.0
- [ ] taxCode: ^[0-9]{10,13}$
```

### 4. Approval Flow (Ref: WF §4 + DOM §1.9)

```
- [ ] requiredLevels đọc từ ApprovalConfig DB (KHÔNG hardcode)
- [ ] approverRolesSequence dùng cho role check tại current level
- [ ] ADMIN override được phép
- [ ] Khi approve hết levels → executeFinalAction()
    - JOB_TRANSFER: update Employee.departmentId/positionId
    - SALARY_ADJUSTMENT: lưu SalaryHistory làm audit
    - TIMESHEET: status → APPROVED
    - PAYROLL_MONTHLY: status → APPROVED
    - LEAVE_SHORT / LEAVE_LONG: LeaveRequest.status → APPROVED
    - PERSONAL_INFO_CHANGE: no-op (data đã commit ở updatePersonalInfo)
    - DISCIPLINE_REWARD: no-op (audit đã capture)
    - OFFBOARDING: Employee.status → TERMINATED + endDate = today, seed 3 OffboardingTask (IT / Admin / Dept)
- [ ] Khi reject ở bất kỳ level nào → status = REJECTED + revert target (nếu có)
- [ ] Ghi ApprovalStepHistory mỗi lần approve/reject
```

### 5. Work Rate Config (Ref: WF §2, BV §2)

```
- [ ] Đọc từ WorkRateConfig table, KHÔNG hardcode constants
- [ ] Default keys: OT_RATE_WEEKDAY (1.5), OT_RATE_WEEKEND (2.0),
                   OT_RATE_HOLIDAY (3.0), NIGHT_SHIFT_BONUS (0.30),
                   STANDARD_WORK_DAYS_MONTH (22), STANDARD_WORK_HOURS_DAY (8),
                   MAX_ANNUAL_LEAVE_DAYS (12)
- [ ] Payroll công thức: NetSalary = baseSalary*(workDays/standardDays) + OT_Pay + allowance - deduction
```

### 6. Password Hashing (Ref: BV §6)

```
- [ ] Nhân viên có Employee record: plaintext = empCode + password + dob (YYYY-MM-DD)
- [ ] Admin không có Employee: plaintext = username + password
- [ ] Bcrypt salt rounds = 10
- [ ] Mật khẩu mặc định khi tạo NV mới phải dùng format chuẩn này
```

### 7. JWT Security (Ref: BV §8)

```
- [ ] Access Token expiresIn: '15m'
- [ ] Refresh Token expiresIn: '7d'
- [ ] Refresh Token Rotation (sliding window) — sinh rnd mới mỗi lần refresh
- [ ] Logout → set refresh_token = NULL trong DB
- [ ] Reuse detection: nếu refreshToken cũ ≠ DB.refreshToken → reject
```

### 8. Entity & FK (Ref: DB §1-21)

```
- [ ] 21 entities mapped khớp schema PostgreSQL
- [ ] @PrimaryColumn type: bigint (Snowflake ID từ DB tự sinh)
- [ ] FK quan hệ đúng:
    - RESTRICT: audit_logs, employees (lịch sử nhân sự)
    - CASCADE: project_tasks, timesheet_entries, approval_step_histories
- [ ] CHECK constraints hours_spent BETWEEN 0.5 AND 24.0
- [ ] UNIQUE(employee_id, work_date) cho attendances
- [ ] UNIQUE(employee_id, month, year) cho salaries
```

### 9. RESTful API (Ref: API §2)

```
- [ ] Method + path khớp chính xác 04_architecture.md mục 2
- [ ] Prefix: /api/v1/...
- [ ] Auth endpoints (login/refresh/logout) KHÔNG yêu cầu JWT
- [ ] Tất cả endpoints khác yêu cầu @UseGuards(JwtAuthGuard)
- [ ] Endpoints nhạy cảm thêm @UseGuards(RolesGuard) + @Roles(...)
- [ ] Controller return qua TransformInterceptor → { success, data, meta }
```

### 10. Audit Logging (Ref: WF §1)

```
- [ ] Mọi CREATE/UPDATE/DELETE/APPROVE/REJECT → ghi SystemAuditLog
- [ ] Capture: actorId, role, IP, UserAgent, oldData, newData
- [ ] Admin xem được audit log + Diff View
```

### 11. UI/i18n (Ref: layout/README.md)

```
- [ ] Button title 1-3 từ (ngắn gọn, súc tích)
- [ ] Tooltip ≤ 15-20 từ khi hover
- [ ] KHÔNG pha trộn Anh-Việt trên cùng UI
- [ ] Vi mode: 100% tiếng Việt (Submit tuần, Xem khác biệt, Chờ tôi duyệt)
- [ ] En mode: 100% tiếng Anh (Submit Week, View Diff, Pending My Approval)
- [ ] Tất cả từ vựng qua i18n key trong locales/{vi,en}.json
```

### 12. Role-Based Access (Ref: DOM §1.13 + BV §1.1)

```
- [ ] ADMIN: tất cả + audit log + reset pass
- [ ] CHAIRMAN: duyệt cấp 4 (đặc biệt)
- [ ] DIRECTOR: duyệt cấp 3 (nhân sự C-level, payroll, salary adj, offboarding)
- [ ] DEPT_LEAD: duyệt cấp 1-2 của direct report
- [ ] EMPLOYEE: chỉ xem/duyệt data của mình
```

### 13. Employee Lifecycle (Ref: DOM §2 + WF §6,7)

```
- [ ] Lifecycle: ONBOARDING → PROBATION → OFFICIAL → NOTICE_PERIOD → TERMINATED
- [ ] Khi initiate offboarding → status = NOTICE_PERIOD (KHÔNG đổi ngay TERMINATED)
- [ ] Final settlement: chỉ chuyển TERMINATED khi đã duyệt đủ 3 cấp + quyết toán xong
- [ ] promoteToOfficial chỉ cho phép từ PROBATION/ONBOARDING
```

---

## 🧪 Quick Self-Test trước khi commit

```bash
# 1. Build pass
cd backend && npm run build

# 2. Lint check (nếu có)
npm run lint

# 3. Tests pass (auth + config checklist - 17 tests đã PASS)
npm test

# 4. Verify endpoints mới
# Test: POST /api/v1/projects (Admin)
# Test: GET /api/v1/timesheets/pending-approval (DEPT_LEAD)
# Test: PATCH /api/v1/employees/:id/promote (HR Lead)
```

---

## 📝 Template Commit Body

```markdown
## Pre-commit Review

### Specs Reviewed
- [ ] business/0X_*.md (refs)
- [ ] database/02_tables_and_relationships.md
- [ ] layout/0X_*.md (UI changes)

### Compliance Verified
- [ ] Enum value khớp business-values.ts
- [ ] Error code nằm trong business.exception.ts map
- [ ] Endpoint khớp 04_architecture.md METHOD + path
- [ ] Validation rules match BV §3
- [ ] Approval level đúng theo workflow matrix (WF §4)
- [ ] Audit log recorded (cho mọi CREATE/UPDATE/DELETE/APPROVE/REJECT)
- [ ] i18nKey tồn tại trong vi.json & en.json
- [ ] RBAC guard (@Roles) đúng role
- [ ] Password hashing format đúng BV §6 (nếu thay đổi)

### Tests
- [ ] npm run build thành công
- [ ] npm test (nếu thêm test mới)
- [ ] Manual test qua Postman/curl
```

---

## 🚦 Trạng Thái Triển Khai (cập nhật liên tục)

| Module | Status | Note |
|--------|--------|------|
| audit-logs | ✅ 100% | + Interceptor |
| auth | ✅ 100% | JWT + Refresh + Role |
| users | ✅ 100% | Update role |
| config | ✅ 100% | Work-rate + Approval Matrix |
| timesheets | ✅ 100% | CRUD + approve/reject + ot-summary |
| approval | ✅ 100% | Engine + DB-driven levels + final actions |
| employees | ✅ 100% | 4 groups + history + promote |
| payroll | ⚠️ 95% | + calculate + salaries + approve + my-payslip (US-25/26) |
| departments | ⚠️ 90% | thiếu POST/PATCH/DELETE (chỉ GET) |
| positions | ⚠️ 90% | thiếu POST/PATCH/DELETE |
| **projects** | ✅ 100% | CRUD + tasks + labor-hours |
| attendance | ❌ 0% | Module TRỐNG (chưa làm) |
| **leave-requests** | ✅ 95% | submit + my-requests + cancel; auto-route 1-or-2 level theo số ngày (US-24a/b) |
| **onboarding** | ✅ 95% | initiate + tasks cho HR/IT/Admin + promote (US-15..18) |
| **offboarding** | ✅ 95% | resignation-request + tasks queue + auto create khi APPROVED (US-19..22) |
| notifications | ❌ 0% | Module TRỐNG (chưa làm) |
| **Frontend** | ⚠️ 95% | + Dashboard live stats; + Leave / Onboarding / Offboarding tabs; + Payroll approve + my-payslip |

---

## 🆕 Cập Nhật Lần Cuối (2026-07-23)

### P1 (4 commits) — fix sai nghiệp vụ đã có
1. **`feat(approval)`**: wire 4 final-action — LEAVE_SHORT/LONG, PERSONAL_INFO_CHANGE, DISCIPLINE_REWARD, OFFBOARDING.
2. **`feat(payroll)`**: `PATCH /payroll/approve` (finalize month) + `GET /payroll/my-payslip`.
3. **`i18n(frontend)`**: route ~12 hardcoded strings qua vi/en locale (App.jsx, Login.jsx, Timesheets.jsx, AuditLogs.jsx).
4. **`feat(dashboard)`**: `GET /employees/stats` (DB-driven stats) → Dashboard số liệu thật thay mock.

### P2 (3 commits) — wire 5 module lớn end-to-end
5. **`feat(leave)`**: leave-requests service + DTO + frontend tab (US-24a/b).
6. **`feat(offboarding)`**: resignation flow + task queue + auto-Terminated khi duyệt (US-19..22).
7. **`feat(onboarding)`**: initiate + tasks cho HR/IT/Admin + promotion OFFICIAL (US-15..18).

**Coverage hiện tại: 23/26 USR end-to-end (88%)**
- US-01..14 ✅
- US-15..22 ✅ (mới P2)
- US-23a..d ✅
- US-24a..b ✅ (mới P2)
- US-25..26 ✅ (mới P1)
- ❌ Còn: notifications (US-14 đã có logic noti mức ApprovalService, thiếu bell icon/panel UI).

---

Cập nhật lần cuối: 2026-07-23
