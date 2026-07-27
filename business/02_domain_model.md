# 02. Phân Tích Yêu Cầu & Mô Hình Hóa Đối Tượng (Domain Model)

Tài liệu này chi tiết hóa toàn bộ **Mô hình đối tượng, thuộc tính, phương thức và mối quan hệ (Câu 2 trong đề thi)**, bao gồm đầy đủ các phương thức tiếp nhận (`onboardEmployee`) và thanh lý bàn giao thôi việc (`offboardEmployee`).

---

## 📐 1. Danh Sách Các Đối Tượng (Entities) & Phương Thức Chi Tiết

### 1.1 `User` (Tài khoản người dùng)
- **Thuộc tính:** `id` (PK), `username`, `passwordHash`, `role` (ENUM: ADMIN, CHAIRMAN, DIRECTOR, DEPT_LEAD, EMPLOYEE), `status`, `createdAt`, `updatedAt`.
- **Phương thức:** `login()`, `logout()`, `changePassword()`, `updateRole()`, `requestPasswordReset()`, `approvePasswordReset()`.

### 1.2 `SystemAuditLog` (Nhật ký Lưu vết Tất cả Giao dịch - Dành cho Admin)
- **Thuộc tính:** `id` (PK), `timestamp` (ISO 8601), `actorId` (FK -> User), `actorRole`, `actionType` (ENUM: CREATE, UPDATE, DELETE, APPROVE, REJECT, LOGIN, EXPORT), `entityName`, `entityId`, `oldData` (JSON), `newData` (JSON), `ipAddress`, `userAgent`.
- **Phương thức:** `recordLog()`, `getAuditLogs()`, `filterLogs()`, `getDiffView()`.

### 1.3 `WorkRateConfig` (Bảng Cấu hình Tham số & Hệ số Giờ công Động)
- **Thuộc tính:** `id` (PK), `configKey`, `configName`, `valueMultiplier`, `effectiveDate`, `status`, `updatedById` (FK).
- **Phương thức:** `getRateByKey()`, `updateRateConfig()`, `getActiveRates()`.

### 1.4 `Project` (Dự án)
- **Thuộc tính:** `id` (PK), `projectCode`, `name`, `startDate`, `endDate`, `pmId` (FK -> Employee / PM dự án), `status` (ENUM: PLANNING, ACTIVE, COMPLETED, SUSPENDED).
- **Phương thức:** `createProject()`, `assignPM()`, `calculateTotalLaborHours()`.

### 1.5 `ProjectTask` (Công việc thuộc Dự án)
- **Thuộc tính:** `id` (PK), `projectId` (FK), `taskName`, `description`, `estimatedHours`.
- **Phương thức:** `createTask()`, `assignMember()`.

### 1.6 `Timesheet` (Bảng Timesheet Tuần)
- **Thuộc tính:** `id` (PK), `employeeId` (FK), `weekNumber`, `year`, `startDate`, `endDate`, `totalNormalHours`, `totalOtHours`, `status` (ENUM: DRAFT, SUBMITTED, APPROVED, REJECTED), `approvalRequestId` (FK -> ApprovalRequest).
- **Phương thức:** `submitTimesheet()`, `approveTimesheet()`, `rejectTimesheet()`, `calculateWeeklyHours()`.

### 1.7 `TimesheetEntry` (Chi tiết dòng khai Timesheet từng ngày)
- **Thuộc tính:** `id` (PK), `timesheetId` (FK), `projectId` (FK), `taskId` (FK), `entryDate`, `hoursSpent`, `workType` (ENUM: NORMAL, OT_WEEKDAY, OT_WEEKEND, OT_HOLIDAY, NIGHT_SHIFT), `appliedRate`, `description`.
- **Phương thức:** `addEntry()`, `updateEntry()`, `deleteEntry()`.

### 1.8 `ApprovalConfig` (Cấu hình Ma trận Phê duyệt Đa Cấp)
- **Thuộc tính:** `id` (PK), `transactionType` (ENUM: LEAVE_SHORT, LEAVE_LONG, TIMESHEET, SALARY_ADJUSTMENT, JOB_TRANSFER, OFFBOARDING, PAYROLL_MONTHLY, RESET_PASSWORD), `requiredLevels`, `approverRolesSequence`.
- **Phương thức:** `configureMatrix()`, `getRequiredLevels()`.

### 1.9 `ApprovalRequest` (Phiếu Yêu cầu Phê duyệt)
- **Thuộc tính:** `id` (PK), `transactionType`, `referenceEntityId`, `requesterId` (FK -> Employee), `currentLevel`, `totalLevels`, `status` (ENUM: PENDING, APPROVED, REJECTED), `createdAt`.
- **Phương thức:** `submitRequest()`, `moveToNextLevel()`, `rejectRequest()`, `completeApproval()`.

### 1.10 `ApprovalStepHistory` (Lịch sử từng Cấp duyệt)
- **Thuộc tính:** `id` (PK), `requestId` (FK), `stepLevel`, `approverRole`, `approverId` (FK), `action`, `comment`, `actionAt`.
- **Phương thức:** `recordStepAction()`, `getStepAuditLogs()`.

### 1.11 `Department` (Phòng ban)
- **Thuộc tính:** `id` (PK), `deptCode`, `name`, `description`, `managerId` (FK -> Employee).
- **Phương thức:** `createDepartment()`, `updateDepartment()`, `assignManager()`, `getEmployeesCount()`.

### 1.12 `Position` (Chức vụ)
- **Thuộc tính:** `id` (PK), `title`, `baseSalaryRatio` (Hệ số lương), `description`.
- **Phương thức:** `createPosition()`, `updateBaseRatio()`.

### 1.13 `Employee` (Nhân viên - Đối tượng Trung tâm)
- **Thuộc tính:** `id` (PK), `empCode`, `fullName`, `email`, `phone`, `gender`, `dob`, `address`, `taxCode`, `bankAccount`, `joinDate`, `endDate`, `status` (ENUM: ONBOARDING, PROBATION, OFFICIAL, SUSPENDED, NOTICE_PERIOD, TERMINATED), `departmentId` (FK), `positionId` (FK), `userId` (FK -> User).
- **Phương thức:**
  - **Quy trình Onboarding:** `onboardEmployee()`, `promoteToOfficial()`.
  - **Cập nhật & Biến động:** `updatePersonalInfo()`, `transferDepartment()`, `adjustSalary()`.
  - **Quy trình Offboarding:** `initiateOffboarding()`, `offboardEmployee()`, `finalizeTermination()`.

### 1.14 `OnboardingTask` (Task tiếp nhận nhân viên mới liên phòng ban)
- **Thuộc tính:** `id` (PK), `employeeId` (FK), `taskTitle`, `targetDepartment`, `assignedById` (FK), `assigneeId` (FK), `dueDate`, `status` (ENUM: PENDING, ASSIGNED, IN_PROGRESS, COMPLETED), `completedAt`.
- **Phương thức:** `createTask()`, `assignToMember()`, `selfAssign()`, `updateStatus()`, `completeTask()`.

### 1.15 `OffboardingTask` (Task thu hồi tài sản & bàn giao liên phòng ban)
- **Thuộc tính:** `id` (PK), `employeeId` (FK), `taskTitle` (Thu hồi laptop, Khóa email/Git, Trả thẻ ra vào, Bàn giao dự án), `targetDepartment` (HR, IT, ADMIN, DIRECT_DEPT), `assignedById` (FK), `assigneeId` (FK), `status` (ENUM: PENDING, ASSIGNED, IN_PROGRESS, COMPLETED), `completedAt`.
- **Phương thức:** `createTask()`, `assignToMember()`, `selfAssign()`, `updateStatus()`, `completeTask()`.

### 1.16 `Notification` (Thông báo & Ticket liên phòng ban)
- **Thuộc tính:** `id` (PK), `recipientId` (FK -> User), `title`, `message`, `linkUrl`, `isRead`, `createdAt`.
- **Phương thức:** `sendNotification()`, `markAsRead()`, `getUnreadCount()`.

### 1.17 `JobHistory` (Lịch sử điều chuyển công tác & thăng tiến)
- **Thuộc tính:** `id` (PK), `employeeId` (FK), `decisionNumber`, `effectiveDate`, `oldDepartmentId` (FK), `newDepartmentId` (FK), `oldPositionId` (FK), `newPositionId` (FK), `approvalRequestId` (FK).
- **Phương thức:** `createTransferOrder()`, `getCareerHistory()`.

### 1.18 `SalaryHistory` (Lịch sử biến động lương & phụ cấp)
- **Thuộc tính:** `id` (PK), `employeeId` (FK), `effectiveDate`, `oldBaseSalary`, `newBaseSalary`, `oldRatio`, `newRatio`, `addendumNumber`, `approvalRequestId` (FK).
- **Phương thức:** `recordSalaryAdjustment()`, `getSalaryTimeline()`.

### 1.19 `Attendance` (Chấm công)
- **Thuộc tính:** `id` (PK), `employeeId` (FK), `workDate`, `checkIn`, `checkOut`, `workHours`, `status`.
- **Phương thức:** `recordCheckIn()`, `recordCheckOut()`, `calculateHours()`.

### 1.20 `LeaveRequest` (Đơn nghỉ phép)
- **Thuộc tính:** `id` (PK), `employeeId` (FK), `startDate`, `endDate`, `reason`, `status`, `approvalRequestId` (FK).
- **Phương thức:** `submitRequest()`, `approveRequest()`, `rejectRequest()`.

### 1.21 `Salary` (Bảng lương)
- **Thuộc tính:** `id` (PK), `employeeId` (FK), `month`, `year`, `baseSalary`, `workDays`, `otNormalHours`, `otWeekendHours`, `otHolidayHours`, `otPayAmount`, `allowance`, `deduction`, `netSalary`, `status`, `approvalRequestId` (FK).
- **Phương thức:** `calculateNetSalary()`, `calculateFinalSettlement()`, `generatePayslip()`.

---

## 🔄 2. Sơ Đồ Vòng Đời Trạng Thái Nhân Viên (Employee Status Lifecycle)

$$\text{ONBOARDING} \xrightarrow{\text{onboardEmployee()}} \text{PROBATION} \xrightarrow{\text{promoteToOfficial()}} \text{OFFICIAL} \xrightarrow{\text{initiateOffboarding()}} \text{NOTICE\_PERIOD} \xrightarrow{\text{offboardEmployee()}} \text{TERMINATED}$$

---

## 🔗 3. Mối Quan Hệ Giữa Các Đối Tượng (Relationships)

- **Employee 1 - N OnboardingTask:** Nhân viên có nhiều task tiếp nhận trong giai đoạn Onboarding.
- **Employee 1 - N OffboardingTask:** Nhân viên thôi việc có nhiều task thu hồi thiết bị & bàn giao liên phòng ban (`OffboardingTask`).
- **User 1 - N SystemAuditLog:** Tất cả thao tác phương thức của `Employee` (`onboardEmployee`, `offboardEmployee`, `transferDepartment`...) đều được ghi nhận vết audit log.
