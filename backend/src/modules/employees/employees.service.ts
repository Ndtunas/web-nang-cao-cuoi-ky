import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Employee } from '../../entities/employee.entity.js';
import { User } from '../../entities/user.entity.js';
import { Department } from '../../entities/department.entity.js';
import { Position } from '../../entities/position.entity.js';
import { JobHistory } from '../../entities/job-history.entity.js';
import { SalaryHistory } from '../../entities/salary-history.entity.js';
import { ApprovalRequest } from '../../entities/approval-request.entity.js';
import { ApprovalConfig } from '../../entities/approval-config.entity.js';
import {
  TransactionType,
  EmployeeStatus,
  UserRole,
} from '../../common/enums/business-values.js';
import { BusinessException } from '../../common/exceptions/business.exception.js';

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

    // Create password hash: theo spec 05_business_values.md mục 6
    // Plaintext block = empCode + password + dob
    // - empCode sẽ được DB sinh tự động (trigger), nhưng đã có sẵn nếu gọi từ flow create
    // - password mặc định cho nhân viên mới: dùng DOB làm password tạm để user tự đổi
    // - dob: format YYYY-MM-DD
    const dobStr = dto.dob ? this.formatDob(dto.dob) : '19950101';
    // Tạm thời hash trước với placeholder username, sẽ update lại sau khi có empCode
    const tempRawPass = `${username}@Temp${dobStr}`;
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

    // Re-hash password theo đúng spec 05_business_values.md mục 6
    // Plaintext block = empCode + password + dob (YYYY-MM-DD)
    // Mật khẩu mặc định ban đầu = "Temp@" + empCode (user sẽ phải đổi khi login lần đầu)
    if (savedUser && foundEmp.empCode) {
      const defaultPassword = `Temp@${foundEmp.empCode}`;
      const properPlaintext = `${foundEmp.empCode}${defaultPassword}${dobStr}`;
      savedUser.passwordHash = await bcrypt.hash(properPlaintext, 10);
      await this.userRepository.save(savedUser);
    }

    return foundEmp;
  }

  /**
   * Format dob sang YYYY-MM-DD (theo spec 05_business_values.md mục 6)
   */
  private formatDob(dob: string | Date): string {
    if (!dob) return '';
    const d = typeof dob === 'string' ? new Date(dob) : dob;
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
}
