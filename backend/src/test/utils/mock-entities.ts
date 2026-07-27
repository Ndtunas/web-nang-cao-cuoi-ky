/**
 * Factory functions to create entity instances for tests.
 * All fields are mutable — extend/modify as needed per test.
 */
import type { DeepPartial } from 'typeorm';

export function createUserWithEmployee(overrides: DeepPartial<any> = {}): { user: any; employee: any } {
  const user = createUser(overrides.user);
  const employee = createEmployee({ ...overrides.employee, userId: user.id, id: overrides.employee?.id ?? 'emp-1' });
  user.employeeId = employee.id;
  return { user, employee };
}

export function createUser(overrides: DeepPartial<any> = {}): any {
  return {
    id: '1',
    username: 'johndoe',
    passwordHash:
      '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHI',
    role: 'EMPLOYEE',
    status: 'ACTIVE',
    refreshToken: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createEmployee(overrides: DeepPartial<any> = {}): any {
  return {
    id: '1',
    empCode: 'EMP-001',
    fullName: 'John Doe',
    email: 'johndoe@example.com',
    phone: '0909123456',
    gender: 'MALE',
    dob: new Date('1995-01-15'),
    address: '123 Main St',
    taxCode: '123456789',
    bankName: 'Vietcombank',
    bankAccount: '1234567890',
    joinDate: new Date('2024-01-01'),
    endDate: null,
    status: 'OFFICIAL',
    departmentId: '1',
    positionId: '1',
    userId: '1',
    annualLeaveBalance: 12,
    createdAt: new Date(),
    updatedAt: new Date(),
    department: createDepartment(),
    position: createPosition(),
    user: createUser(),
    ...overrides,
  };
}

export function createDepartment(overrides: DeepPartial<any> = {}): any {
  return {
    id: '1',
    deptCode: 'IT',
    name: 'Information Technology',
    description: 'IT Department',
    managerId: '1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createPosition(overrides: DeepPartial<any> = {}): any {
  return {
    id: '1',
    title: 'Software Engineer',
    baseSalaryRatio: 1.0,
    description: 'Developer role',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createApprovalRequest(overrides: DeepPartial<any> = {}): any {
  return {
    id: '1',
    requestCode: 'APR-001',
    transactionType: 'LEAVE_SHORT',
    referenceEntityId: '1',
    requesterId: '1',
    currentLevel: 1,
    totalLevels: 1,
    status: 'PENDING',
    createdAt: new Date(),
    updatedAt: new Date(),
    requester: createEmployee(),
    ...overrides,
  };
}

export function createApprovalStepHistory(overrides: DeepPartial<any> = {}): any {
  return {
    id: '1',
    requestId: '1',
    stepLevel: 1,
    approverRole: 'DEPT_LEAD',
    approverId: '2',
    action: 'APPROVE',
    comment: 'Approved',
    actionAt: new Date(),
    approver: createEmployee({ id: '2' }),
    ...overrides,
  };
}

export function createApprovalConfig(overrides: DeepPartial<any> = {}): any {
  return {
    id: '1',
    transactionType: 'LEAVE_SHORT',
    requiredLevels: 1,
    approverRolesSequence: ['DEPT_LEAD'],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createTimesheet(overrides: DeepPartial<any> = {}): any {
  return {
    id: '1',
    timesheetCode: 'TS-EMP-001-W01-2026',
    employeeId: '1',
    weekNumber: 1,
    year: 2026,
    startDate: new Date('2026-01-06'),
    endDate: new Date('2026-01-12'),
    totalNormalHours: 0,
    totalOtHours: 0,
    status: 'DRAFT',
    approvalRequestId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    employee: createEmployee(),
    ...overrides,
  };
}

export function createTimesheetEntry(overrides: DeepPartial<any> = {}): any {
  return {
    id: '1',
    timesheetId: '1',
    projectId: '1',
    taskId: '1',
    entryDate: new Date('2026-01-06'),
    hoursSpent: 8,
    workType: 'NORMAL',
    appliedRate: 1.0,
    description: 'Work',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createAttendance(overrides: DeepPartial<any> = {}): any {
  return {
    id: '1',
    employeeId: '1',
    workDate: new Date(),
    checkIn: '08:00:00',
    checkOut: null,
    workHours: 0,
    status: 'PRESENT',
    createdAt: new Date(),
    ...overrides,
  };
}

export function createLeaveRequest(overrides: DeepPartial<any> = {}): any {
  return {
    id: '1',
    employeeId: '1',
    leaveType: 'ANNUAL_LEAVE',
    startDate: new Date('2026-02-01'),
    endDate: new Date('2026-02-02'),
    reason: 'Personal',
    status: 'PENDING',
    approvalRequestId: '1',
    createdAt: new Date(),
    updatedAt: new Date(),
    employee: createEmployee(),
    ...overrides,
  };
}

export function createNotification(overrides: DeepPartial<any> = {}): any {
  return {
    id: '1',
    recipientId: '1',
    title: 'Approval Required',
    message: 'Please review',
    linkUrl: '/approvals/1',
    referenceEntityId: '1',
    isRead: false,
    createdAt: new Date(),
    ...overrides,
  };
}

export function createOnboardingTask(overrides: DeepPartial<any> = {}): any {
  return {
    id: '1',
    employeeId: '1',
    taskTitle: 'Thu thập hồ sơ',
    targetDepartment: 'HR',
    assignedById: '2',
    assigneeId: null,
    dueDate: new Date(),
    status: 'PENDING',
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    employee: createEmployee(),
    ...overrides,
  };
}

export function createOffboardingTask(overrides: DeepPartial<any> = {}): any {
  return {
    id: '1',
    employeeId: '1',
    taskTitle: 'Thu hồi máy tính',
    targetDepartment: 'IT',
    assignedById: '2',
    assigneeId: null,
    status: 'PENDING',
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    employee: createEmployee(),
    ...overrides,
  };
}

export function createJobHistory(overrides: DeepPartial<any> = {}): any {
  return {
    id: '1',
    decisionNumber: 'DEC-TRANS-001',
    employeeId: '1',
    effectiveDate: new Date(),
    oldDepartmentId: '1',
    newDepartmentId: '2',
    oldPositionId: '1',
    newPositionId: '2',
    approvalRequestId: '1',
    createdAt: new Date(),
    oldDepartment: createDepartment({ id: '1', name: 'Old Dept' }),
    newDepartment: createDepartment({ id: '2', name: 'New Dept' }),
    oldPosition: createPosition({ id: '1', title: 'Junior' }),
    newPosition: createPosition({ id: '2', title: 'Senior' }),
    ...overrides,
  };
}

export function createSalaryHistory(overrides: DeepPartial<any> = {}): any {
  return {
    id: '1',
    addendumNumber: 'ADD-SAL-001',
    employeeId: '1',
    effectiveDate: new Date(),
    oldBaseSalary: 15000000,
    newBaseSalary: 18000000,
    oldRatio: 1.0,
    newRatio: 1.2,
    approvalRequestId: '1',
    createdAt: new Date(),
    ...overrides,
  };
}

export function createSalary(overrides: DeepPartial<any> = {}): any {
  return {
    id: '1',
    payrollCode: 'PAY-1-1-2026',
    employeeId: '1',
    month: 1,
    year: 2026,
    baseSalary: 15000000,
    workDays: 22,
    otNormalHours: 0,
    otWeekendHours: 0,
    otHolidayHours: 0,
    otPayAmount: 0,
    nightShiftHours: 0,
    nightShiftBonus: 0,
    allowance: 1500000,
    deduction: 500000,
    netSalary: 16000000,
    status: 'DRAFT',
    approvalRequestId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    employee: createEmployee(),
    ...overrides,
  };
}

export function createProject(overrides: DeepPartial<any> = {}): any {
  return {
    id: '1',
    projectCode: 'PRJ-001',
    name: 'Internal HRM',
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-12-31'),
    pmId: '1',
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
    pm: createEmployee(),
    ...overrides,
  };
}

export function createProjectTask(overrides: DeepPartial<any> = {}): any {
  return {
    id: '1',
    projectId: '1',
    taskName: 'Backend API',
    description: 'Implement API',
    estimatedHours: 40,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createWorkRateConfig(overrides: DeepPartial<any> = {}): any {
  return {
    id: '1',
    configKey: 'OT_RATE_WEEKDAY',
    configName: 'OT Rate Weekday',
    valueMultiplier: 1.5,
    effectiveDate: new Date(),
    status: 'ACTIVE',
    updatedById: '1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createSystemAuditLog(overrides: DeepPartial<any> = {}): any {
  return {
    id: '1',
    timestamp: new Date(),
    actorId: '1',
    actorRole: 'ADMIN',
    actionType: 'CREATE',
    entityName: 'Employee',
    entityId: '1',
    oldData: null,
    newData: { name: 'John Doe' },
    ipAddress: '127.0.0.1',
    userAgent: 'TestAgent',
    ...overrides,
  };
}
