# Sơ đồ Lớp (Class Diagram) - HRM System Entity Model

Tài liệu này cung cấp **Sơ đồ Lớp (Class Diagram)** mô tả các thực thể (Entities), thuộc tính và mối quan hệ giữa chúng trong hệ thống quản lý nhân sự HRM, được thiết kế theo cấu trúc chiều dọc (`direction TB`) để hiển thị tối ưu trên trang báo cáo A4.

```mermaid
classDiagram
    direction TB

    class User {
        +bigint id
        +string username
        +string passwordHash
        +string role
        +string status
        +datetime createdAt
        +datetime updatedAt
    }

    class Employee {
        +bigint id
        +string empCode
        +string fullName
        +string email
        +string phone
        +string gender
        +date dob
        +string address
        +string taxCode
        +string bankName
        +string bankAccount
        +date joinDate
        +date endDate
        +string status
        +bigint departmentId
        +bigint positionId
        +bigint userId
        +int annualLeaveBalance
    }

    class Department {
        +bigint id
        +string deptCode
        +string name
        +string description
        +bigint managerId
    }

    class Position {
        +bigint id
        +string title
        +decimal baseSalaryRatio
        +string description
    }

    class Timesheet {
        +bigint id
        +string timesheetCode
        +bigint employeeId
        +int weekNumber
        +int year
        +date startDate
        +date endDate
        +decimal totalNormalHours
        +decimal totalOtHours
        +string status
        +bigint approvalRequestId
    }

    class TimesheetEntry {
        +bigint id
        +bigint timesheetId
        +bigint projectId
        +bigint taskId
        +date date
        +decimal hoursSpent
        +string workType
        +decimal appliedRate
        +string description
    }

    class Salary {
        +bigint id
        +string payrollCode
        +bigint employeeId
        +int month
        +int year
        +decimal baseSalary
        +decimal workDays
        +decimal otNormalHours
        +decimal otWeekendHours
        +decimal otHolidayHours
        +decimal otPayAmount
        +decimal nightShiftHours
        +decimal nightShiftBonus
        +decimal allowance
        +decimal deduction
        +decimal netSalary
        +string status
        +bigint approvalRequestId
    }

    class SalaryHistory {
        +bigint id
        +string addendumNumber
        +bigint employeeId
        +date effectiveDate
        +decimal oldBaseSalary
        +decimal newBaseSalary
        +decimal oldRatio
        +decimal newRatio
        +bigint approvalRequestId
    }

    class ApprovalRequest {
        +bigint id
        +string requestCode
        +string transactionType
        +string referenceEntityId
        +bigint requesterId
        +int currentLevel
        +int totalLevels
        +string status
    }

    class ApprovalStepHistory {
        +bigint id
        +bigint requestId
        +int stepLevel
        +string approverRole
        +bigint approverId
        +string action
        +string comment
        +datetime actionAt
    }

    class LeaveRequest {
        +bigint id
        +bigint employeeId
        +string leaveType
        +date startDate
        +date endDate
        +string reason
        +string status
        +bigint approvalRequestId
    }

    User "1" -- "0..1" Employee : owns
    Employee "1" -- "0..*" Timesheet : submits
    Employee "1" -- "0..*" LeaveRequest : requests
    Employee "1" -- "0..*" Salary : earns
    Employee "1" -- "0..*" SalaryHistory : salary_changes
    Department "1" -- "0..*" Employee : employs
    Position "1" -- "0..*" Employee : defines_role
    Employee "1" -- "0..1" Department : manages
    Timesheet "1" *-- "0..*" TimesheetEntry : contains
    ApprovalRequest "1" *-- "0..*" ApprovalStepHistory : logs
    Timesheet "0..1" -- "0..1" ApprovalRequest : requires_approval
    LeaveRequest "0..1" -- "0..1" ApprovalRequest : requires_approval
    Salary "0..1" -- "0..1" ApprovalRequest : requires_approval
    SalaryHistory "0..1" -- "0..1" ApprovalRequest : requires_approval
```
