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
import { BusinessException } from '../../common/exceptions/business.exception.js';
import { UserRole } from '../../common/enums/business-values.js';

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
  ) {}

  async findAll(): Promise<Employee[]> {
    return this.employeeRepository.find({
      relations: { department: true, position: true, user: true },
      order: { empCode: 'ASC' },
    });
  }

  async create(dto: any): Promise<Employee> {
    // 1. Check if email exists
    const existing = await this.employeeRepository.findOne({ where: { email: dto.email } });
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

    // Create password hash: default is compound username + "123456" + dob (e.g. 1995-11-30 -> "19951130")
    const dobStr = dto.dob ? dto.dob.replace(/-/g, '') : '19950101';
    const rawPass = `${username}123456${dobStr}`;
    const passwordHash = await bcrypt.hash(rawPass, 10);

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
      const existing = await this.employeeRepository.findOne({ where: { email: dto.email } });
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
    const requester = await this.employeeRepository.findOne({ where: { userId: requesterUserId } });
    if (!requester) {
      throw new BusinessException('ERR_AUTH_001');
    }

    const employee = await this.employeeRepository.findOne({ where: { id: dto.employeeId } });
    if (!employee) {
      throw new BusinessException('ERR_AUTH_003');
    }

    // Rule: Cannot transfer if employee is in NOTICE_PERIOD (ERR_EMP_002)
    if (employee.status === 'NOTICE_PERIOD') {
      throw new BusinessException('ERR_EMP_002');
    }

    // Create Approval Request (Group B -> 2 levels: Dept Lead -> Director)
    const approvalReq = this.approvalRequestRepository.create({
      transactionType: 'JOB_TRANSFER',
      referenceEntityId: '', // Update later
      requesterId: requester.id,
      currentLevel: 1,
      totalLevels: 2,
      status: 'PENDING',
    });
    const savedReq = await this.approvalRequestRepository.save(approvalReq);

    // Create Job History
    const jobHistory = this.jobHistoryRepository.create({
      decisionNumber: `DEC-TRANS-${Date.now()}`,
      employeeId: employee.id,
      effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : new Date(),
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

  async submitSalaryAdjustment(dto: any, requesterUserId: string): Promise<any> {
    const requester = await this.employeeRepository.findOne({ where: { userId: requesterUserId } });
    if (!requester) {
      throw new BusinessException('ERR_AUTH_001');
    }

    const employee = await this.employeeRepository.findOne({ where: { id: dto.employeeId } });
    if (!employee) {
      throw new BusinessException('ERR_AUTH_003');
    }

    // Fetch current position description for ratio
    const currentPosition = await this.positionRepository.findOne({ where: { id: employee.positionId } });
    const currentRatio = currentPosition ? currentPosition.baseSalaryRatio : 1.0;

    // Create Approval Request (Group C -> 3 levels: Dept Lead -> HR Lead -> Chairman)
    const approvalReq = this.approvalRequestRepository.create({
      transactionType: 'SALARY_ADJUSTMENT',
      referenceEntityId: '',
      requesterId: requester.id,
      currentLevel: 1,
      totalLevels: 3,
      status: 'PENDING',
    });
    const savedReq = await this.approvalRequestRepository.save(approvalReq);

    // Fetch latest salary or default
    const oldBaseSalary = 15000000; // Mock current if not found

    const salaryHistory = this.salaryHistoryRepository.create({
      addendumNumber: `ADD-SAL-${Date.now()}`,
      employeeId: employee.id,
      effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : new Date(),
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
}
