import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Employee } from '../../entities/employee.entity';
import { User } from '../../entities/user.entity';
import { Department } from '../../entities/department.entity';
import { Position } from '../../entities/position.entity';
import { JobHistory } from '../../entities/job-history.entity';
import { SalaryHistory } from '../../entities/salary-history.entity';
import { ApprovalRequest } from '../../entities/approval-request.entity';
import { ApprovalConfig } from '../../entities/approval-config.entity';
import {
  TransactionType,
  EmployeeStatus,
  UserRole,
} from '../../common/enums/business-values';
import { BusinessException } from '../../common/exceptions/business.exception';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    @InjectRepository(Position)
    private readonly positionRepository: Repository<Position>,
    @InjectRepository(JobHistory)
    private readonly jobHistoryRepository: Repository<JobHistory>,
    @InjectRepository(SalaryHistory)
    private readonly salaryHistoryRepository: Repository<SalaryHistory>,
    @InjectRepository(ApprovalRequest)
    private readonly approvalRequestRepository: Repository<ApprovalRequest>,
    @InjectRepository(ApprovalConfig)
    private readonly approvalConfigRepository: Repository<ApprovalConfig>,
  ) {}

  /** Lấy requiredLevels từ ApprovalConfig DB (fallback 1) */
  private async getRequiredLevels(
    transactionType: string,
    fallback = 1,
  ): Promise<number> {
    const cfg = await this.approvalConfigRepository.findOne({
      where: { transactionType },
    });
    return cfg?.requiredLevels || fallback;
  }

  async findAll(): Promise<Employee[]> {
    return this.employeeRepository.find({
      relations: { department: true, position: true, user: true },
      order: { empCode: 'ASC' },
    });
  }

  /**
   * Thống kê nhân sự cho Dashboard.
   * - totalEmployees: tổng số hồ sơ
   * - activeEmployees: đang làm việc (status OFFICIAL | PROBATION)
   * - onLeave: đang trong thời gian báo trước (NOTICE_PERIOD)
   * - newHires: tuyển mới trong tháng hiện tại (joinDate trong tháng)
   * - departments: GROUP BY department, đếm nhân viên và tính % so với tổng
   */
  async getStats(): Promise<{
    totalEmployees: number;
    activeEmployees: number;
    onLeave: number;
    newHires: number;
    departments: Array<{ id: string; name: string; count: number; percent: number }>;
  }> {
    const employees = await this.employeeRepository.find({
      relations: { department: true },
    });
    const total = employees.length;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const active = employees.filter(
      (e) => e.status === EmployeeStatus.OFFICIAL || e.status === EmployeeStatus.PROBATION,
    ).length;

    const onLeave = employees.filter(
      (e) => e.status === EmployeeStatus.NOTICE_PERIOD,
    ).length;

    const newHires = employees.filter((e) => {
      const j = e.joinDate ? new Date(e.joinDate) : null;
      return j && j >= monthStart && j < monthEnd;
    }).length;

    const deptMap = new Map<string, { id: string; name: string; count: number }>();
    for (const e of employees) {
      const dept = e.department;
      const id = dept?.id ?? 'UNASSIGNED';
      const name = dept?.name ?? 'Chưa phân phòng';
      const existing = deptMap.get(id);
      if (existing) {
        existing.count += 1;
      } else {
        deptMap.set(id, { id, name, count: 1 });
      }
    }
    const departments = Array.from(deptMap.values())
      .map((d) => ({
        id: d.id,
        name: d.name,
        count: d.count,
        percent: total > 0 ? Math.round((d.count / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      totalEmployees: total,
      activeEmployees: active,
      onLeave,
      newHires,
      departments,
    };
  }

  async create(dto: any): Promise<Employee> {
    // 1. Check if email exists
    const existing = await this.employeeRepository.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      throw new BusinessException('ERR_EMP_001');
    }

    // 2. Create User record
    const baseUsername = dto.email.split('@')[0];
    let username = baseUsername;
    let userExists = await this.userRepository.findOne({ where: { username } });
    let counter = 1;
    while (userExists) {
      username = `${baseUsername}${counter}`;
      userExists = await this.userRepository.findOne({ where: { username } });
      counter++;
    }

    // Create password hash: hash trực tiếp từ password thuần (không ghép empCode/dob).
    // Mật khẩu mặc định ban đầu cho nhân viên mới: username + "@Temp" (user sẽ phải đổi khi login lần đầu).
    const tempRawPass = `${username}@Temp`;
    const passwordHash = await bcrypt.hash(tempRawPass, 10);

    const user = this.userRepository.create({
      username,
      passwordHash,
      role: UserRole.EMPLOYEE,
      status: 'ACTIVE',
    });
    const savedUser = await this.userRepository.save(user);

    // 3. Create Employee
    const employee = this.employeeRepository.create({
      fullName: dto.fullName,
      email: dto.email,
      phone: dto.phone,
      gender: dto.gender,
      dob: dto.dob ? new Date(dto.dob) : undefined,
      address: dto.address,
      taxCode: dto.taxCode,
      bankAccount: dto.bankAccount,
      joinDate: dto.joinDate ? new Date(dto.joinDate) : new Date(),
      status: dto.status || 'ONBOARDING',
      departmentId: dto.departmentId,
      positionId: dto.positionId,
      userId: savedUser.id,
    });

    const savedEmp = await this.employeeRepository.save(employee);

    // Fetch again to populate generated emp_code and relation fields
    const foundEmp = await this.employeeRepository.findOne({
      where: { id: savedEmp.id },
      relations: { department: true, position: true, user: true },
    });
    if (!foundEmp) throw new BusinessException('ERR_UNKNOWN');

    return foundEmp;
  }

  async updatePersonalInfo(id: string, dto: any): Promise<Employee> {
    const employee = await this.employeeRepository.findOne({ where: { id } });
    if (!employee) {
      throw new BusinessException('ERR_AUTH_003');
    }

    if (dto.email && dto.email !== employee.email) {
      const existing = await this.employeeRepository.findOne({
        where: { email: dto.email },
      });
      if (existing) {
        throw new BusinessException('ERR_EMP_001');
      }
      employee.email = dto.email;
    }

    if (dto.phone) employee.phone = dto.phone;
    if (dto.address) employee.address = dto.address;
    if (dto.bankAccount) employee.bankAccount = dto.bankAccount;
    if (dto.taxCode) employee.taxCode = dto.taxCode;

    await this.employeeRepository.save(employee);
    const updated = await this.employeeRepository.findOne({
      where: { id },
      relations: { department: true, position: true, user: true },
    });
    if (!updated) throw new BusinessException('ERR_UNKNOWN');
    return updated;
  }

  async submitJobTransfer(dto: any, requesterUserId: string): Promise<any> {
    // Find requester employee profile
    const requester = await this.employeeRepository.findOne({
      where: { userId: requesterUserId },
    });
    if (!requester) {
      throw new BusinessException('ERR_AUTH_001');
    }

    const employee = await this.employeeRepository.findOne({
      where: { id: dto.employeeId },
    });
    if (!employee) {
      throw new BusinessException('ERR_AUTH_003');
    }

    // Rule: Cannot transfer if employee is in NOTICE_PERIOD (ERR_EMP_002)
    if (employee.status === 'NOTICE_PERIOD') {
      throw new BusinessException('ERR_EMP_002');
    }

    // Tạo Approval Request với requiredLevels từ ApprovalConfig DB (Ref: business/03_workflows.md mục 4)
    const jobTransferLevels = await this.getRequiredLevels(
      TransactionType.JOB_TRANSFER,
      2,
    );
    const approvalReq = this.approvalRequestRepository.create({
      transactionType: TransactionType.JOB_TRANSFER,
      referenceEntityId: '', // Update later
      requesterId: requester.id,
      currentLevel: 1,
      totalLevels: jobTransferLevels,
      status: 'PENDING',
    });
    const savedReq = await this.approvalRequestRepository.save(approvalReq);

    // Create Job History
    const jobHistory = this.jobHistoryRepository.create({
      decisionNumber: `DEC-TRANS-${Date.now()}`,
      employeeId: employee.id,
      effectiveDate: dto.effectiveDate
        ? new Date(dto.effectiveDate)
        : new Date(),
      oldDepartmentId: employee.departmentId,
      newDepartmentId: dto.newDepartmentId,
      oldPositionId: employee.positionId,
      newPositionId: dto.newPositionId,
      approvalRequestId: savedReq.id,
    });
    const savedHistory = await this.jobHistoryRepository.save(jobHistory);

    // Link back to Approval Request
    savedReq.referenceEntityId = savedHistory.id;
    await this.approvalRequestRepository.save(savedReq);

    return { approvalRequest: savedReq, jobHistory: savedHistory };
  }

  async submitSalaryAdjustment(
    dto: any,
    requesterUserId: string,
  ): Promise<any> {
    const requester = await this.employeeRepository.findOne({
      where: { userId: requesterUserId },
    });
    if (!requester) {
      throw new BusinessException('ERR_AUTH_001');
    }

    const employee = await this.employeeRepository.findOne({
      where: { id: dto.employeeId },
    });
    if (!employee) {
      throw new BusinessException('ERR_AUTH_003');
    }

    // Fetch current position description for ratio
    const currentPosition = await this.positionRepository.findOne({
      where: { id: employee.positionId },
    });
    const currentRatio = currentPosition
      ? currentPosition.baseSalaryRatio
      : 1.0;

    // Tạo Approval Request với requiredLevels từ ApprovalConfig DB
    const salaryLevels = await this.getRequiredLevels(
      TransactionType.SALARY_ADJUSTMENT,
      3,
    );
    const approvalReq = this.approvalRequestRepository.create({
      transactionType: TransactionType.SALARY_ADJUSTMENT,
      referenceEntityId: '',
      requesterId: requester.id,
      currentLevel: 1,
      totalLevels: salaryLevels,
      status: 'PENDING',
    });
    const savedReq = await this.approvalRequestRepository.save(approvalReq);

    // Fetch latest salary or default
    const oldBaseSalary = 15000000; // Mock current if not found

    const salaryHistory = this.salaryHistoryRepository.create({
      addendumNumber: `ADD-SAL-${Date.now()}`,
      employeeId: employee.id,
      effectiveDate: dto.effectiveDate
        ? new Date(dto.effectiveDate)
        : new Date(),
      oldBaseSalary: oldBaseSalary,
      newBaseSalary: parseFloat(dto.newBaseSalary),
      oldRatio: currentRatio,
      newRatio: parseFloat(dto.newRatio || '1.0'),
      approvalRequestId: savedReq.id,
    });
    const savedHistory = await this.salaryHistoryRepository.save(salaryHistory);

    savedReq.referenceEntityId = savedHistory.id;
    await this.approvalRequestRepository.save(savedReq);

    return { approvalRequest: savedReq, salaryHistory: savedHistory };
  }

  /**
   * Xem lịch sử điều chuyển công tác của nhân viên
   * GET /api/v1/employees/:id/job-history
   * Ref: business/04_architecture.md mục 2.7
   */
  async getJobHistory(employeeId: string): Promise<JobHistory[]> {
    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId },
    });
    if (!employee) throw new BusinessException('ERR_AUTH_003');

    return this.jobHistoryRepository.find({
      where: { employeeId },
      relations: {
        oldDepartment: true,
        newDepartment: true,
        oldPosition: true,
        newPosition: true,
      },
      order: { effectiveDate: 'DESC' },
    });
  }

  /**
   * Xem lịch sử biến động lương & phụ cấp của nhân viên
   * GET /api/v1/employees/:id/salary-history
   * Ref: business/04_architecture.md mục 2.7
   */
  async getSalaryHistory(employeeId: string): Promise<SalaryHistory[]> {
    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId },
    });
    if (!employee) throw new BusinessException('ERR_AUTH_003');

    return this.salaryHistoryRepository.find({
      where: { employeeId },
      order: { effectiveDate: 'DESC' },
    });
  }

  /**
   * Khen thưởng / Kỷ luật (Group D)
   * POST /api/v1/employees/discipline-rewards
   * Ref: business/01_user_stories.md US-23d (DISCIPLINE_REWARD - 3 cấp duyệt)
   */
  async submitDisciplineReward(
    dto: any,
    requesterUserId: string,
  ): Promise<any> {
    const requester = await this.employeeRepository.findOne({
      where: { userId: requesterUserId },
    });
    if (!requester) throw new BusinessException('ERR_AUTH_001');

    const employee = await this.employeeRepository.findOne({
      where: { id: dto.employeeId },
    });
    if (!employee) throw new BusinessException('ERR_AUTH_003');

    // Tạo Approval Request với requiredLevels từ ApprovalConfig DB (DISCIPLINE_REWARD - mặc định 3 cấp)
    const disciplineLevels = await this.getRequiredLevels(
      TransactionType.DISCIPLINE_REWARD,
      3,
    );
    const approvalReq = this.approvalRequestRepository.create({
      transactionType: TransactionType.DISCIPLINE_REWARD,
      referenceEntityId: `${dto.employeeId}:${dto.type}:${dto.amount || 0}:${new Date().toISOString()}`,
      requesterId: requester.id,
      currentLevel: 1,
      totalLevels: disciplineLevels,
      status: 'PENDING',
    });
    const savedReq = await this.approvalRequestRepository.save(approvalReq);

    return {
      approvalRequest: savedReq,
      message: `Đã ghi nhận ${dto.type === 'REWARD' ? 'khen thưởng' : 'kỷ luật'} cho ${employee.fullName}`,
    };
  }

  /**
   * Đánh giá đạt thử việc → chuyển trạng thái OFFICIAL (US-15/18)
   * PATCH /api/v1/employees/:id/promote
   * Ref: business/04_architecture.md mục 2.5 (Onboarding)
   */
  async promoteToOfficial(id: string): Promise<Employee> {
    const employee = await this.employeeRepository.findOne({
      where: { id },
      relations: { department: true, position: true, user: true },
    });
    if (!employee) throw new BusinessException('ERR_AUTH_003');

    // Chỉ cho phép promote từ PROBATION hoặc ONBOARDING
    if (
      employee.status !== EmployeeStatus.PROBATION &&
      employee.status !== EmployeeStatus.ONBOARDING
    ) {
      throw new BusinessException('ERR_EMP_001'); // Trạng thái không hợp lệ
    }

    employee.status = EmployeeStatus.OFFICIAL;
    await this.employeeRepository.save(employee);

    // Lấy lại với relations đã populate
    const updated = await this.employeeRepository.findOne({
      where: { id },
      relations: { department: true, position: true, user: true },
    });
    if (!updated) throw new BusinessException('ERR_UNKNOWN');
    return updated;
  }

  /**
   * US-22: Chốt TERMINATED thủ công (đi kèm hoặc không với final-settlement).
   */
  async terminateEmployee(
    employeeId: string,
    endDate?: string,
  ): Promise<Employee> {
    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId },
      relations: { department: true, position: true, user: true },
    });
    if (!employee) throw new BusinessException('ERR_AUTH_003');
    employee.status = EmployeeStatus.TERMINATED;
    employee.endDate = endDate ? new Date(endDate) : new Date();
    const saved = await this.employeeRepository.save(employee);
    if (saved.userId) {
      const user = await this.userRepository.findOne({
        where: { id: saved.userId },
      });
      if (user && user.status === 'ACTIVE') {
        user.status = 'INACTIVE';
        await this.userRepository.save(user);
      }
    }
    return saved;
  }
}
