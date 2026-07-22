import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApprovalRequest } from '../../entities/approval-request.entity.js';
import { ApprovalStepHistory } from '../../entities/approval-step-history.entity.js';
import { ApprovalConfig } from '../../entities/approval-config.entity.js';
import { Employee } from '../../entities/employee.entity.js';
import { Timesheet } from '../../entities/timesheet.entity.js';
import { User } from '../../entities/user.entity.js';
import { JobHistory } from '../../entities/job-history.entity.js';
import { SalaryHistory } from '../../entities/salary-history.entity.js';
import { Salary } from '../../entities/salary.entity.js';
import { BusinessException } from '../../common/exceptions/business.exception.js';

/**
 * Service phê duyệt đa cấp
 * Ref: business/03_workflows.md mục 4 (Approval Matrix), mục 5 (State Machine)
 *      business/04_architecture.md mục 2.4 endpoints
 *
 * Quy trình:
 *   1. Submit request → currentLevel=1, totalLevels từ ApprovalConfig DB
 *   2. Approve ở level hiện tại → lưu ApprovalStepHistory
 *   3. Nếu còn cấp → next level; nếu hết → APPROVED + executeFinalAction()
 *      - JOB_TRANSFER: update Employee.departmentId/positionId
 *      - SALARY_ADJUSTMENT: lưu vào SalaryHistory (không đụng Employee.positionId để giữ audit)
 *      - TIMESHEET: chuyển status APPROVED
 *      - PAYROLL_MONTHLY: chuyển status APPROVED (chốt bảng lương)
 */
@Injectable()
export class ApprovalService {
  constructor(
    @InjectRepository(ApprovalRequest)
    private readonly approvalRequestRepository: Repository<ApprovalRequest>,
    @InjectRepository(ApprovalStepHistory)
    private readonly approvalStepHistoryRepository: Repository<ApprovalStepHistory>,
    @InjectRepository(ApprovalConfig)
    private readonly approvalConfigRepository: Repository<ApprovalConfig>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Timesheet)
    private readonly timesheetRepository: Repository<Timesheet>,
    @InjectRepository(JobHistory)
    private readonly jobHistoryRepository: Repository<JobHistory>,
    @InjectRepository(SalaryHistory)
    private readonly salaryHistoryRepository: Repository<SalaryHistory>,
    @InjectRepository(Salary)
    private readonly salaryRepository: Repository<Salary>,
  ) {}

  // ============== CONFIG ==============

  async getApprovalConfigs(): Promise<ApprovalConfig[]> {
    return this.approvalConfigRepository.find({
      order: { transactionType: 'ASC' },
    });
  }

  async updateApprovalConfig(
    transactionType: string,
    requiredLevels: number,
  ): Promise<ApprovalConfig> {
    const config = await this.approvalConfigRepository.findOne({
      where: { transactionType },
    });
    if (!config) {
      throw new BusinessException('ERR_APPROVAL_003');
    }
    config.requiredLevels = requiredLevels;
    // Adjust roles sequence length accordingly
    const roles = ['DEPT_LEAD', 'DIRECTOR', 'CHAIRMAN'];
    config.approverRolesSequence = roles.slice(0, requiredLevels);
    return this.approvalConfigRepository.save(config);
  }

  /** Look up approval config theo transactionType (dùng nội bộ) */
  async getConfigForTransaction(
    transactionType: string,
  ): Promise<ApprovalConfig | null> {
    return this.approvalConfigRepository.findOne({
      where: { transactionType },
    });
  }

  // ============== REQUESTS ==============

  async getPendingMyLevel(userId: string): Promise<any[]> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new BusinessException('ERR_AUTH_001');

    const allPending = await this.approvalRequestRepository.find({
      where: { status: 'PENDING' },
      relations: { requester: true },
    });

    const configs = await this.approvalConfigRepository.find();
    const configMap = new Map(configs.map((c) => [c.transactionType, c]));

    const result: any[] = [];
    for (const req of allPending) {
      const config = configMap.get(req.transactionType);
      if (!config) continue;

      const sequence = (config.approverRolesSequence as string[]) || [];
      const currentRequiredRole = sequence[req.currentLevel - 1];

      if (!currentRequiredRole) continue;

      // Match nếu user đúng role, hoặc ADMIN override
      if (user.role === currentRequiredRole || user.role === 'ADMIN') {
        result.push({
          ...req,
          requiredRole: currentRequiredRole,
        });
      }
    }
    return result;
  }

  async getMySubmitted(userId: string): Promise<ApprovalRequest[]> {
    const employee = await this.employeeRepository.findOne({
      where: { userId },
    });
    if (!employee) return [];

    return this.approvalRequestRepository.find({
      where: { requesterId: employee.id },
      relations: { requester: true },
      order: { createdAt: 'DESC' },
    });
  }

  async approve(
    id: string,
    comment: string,
    userId: string,
  ): Promise<ApprovalRequest> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new BusinessException('ERR_AUTH_001');

    const employee = await this.employeeRepository.findOne({
      where: { userId },
    });
    const empId = employee ? employee.id : null;

    const request = await this.approvalRequestRepository.findOne({
      where: { id },
    });
    if (!request) throw new BusinessException('ERR_APPROVAL_003');
    if (request.status !== 'PENDING')
      throw new BusinessException('ERR_APPROVAL_002');

    const config = await this.approvalConfigRepository.findOne({
      where: { transactionType: request.transactionType },
    });
    if (!config) throw new BusinessException('ERR_APPROVAL_004');

    const sequence = (config.approverRolesSequence as string[]) || [];
    const requiredRole = sequence[request.currentLevel - 1];
    if (
      !requiredRole ||
      (user.role !== requiredRole && user.role !== 'ADMIN')
    ) {
      throw new BusinessException('ERR_APPROVAL_001');
    }

    // 1. Save history record
    const history = this.approvalStepHistoryRepository.create({
      requestId: request.id,
      stepLevel: request.currentLevel,
      approverRole: requiredRole,
      approverId: empId,
      action: 'APPROVE',
      comment,
    });
    await this.approvalStepHistoryRepository.save(history);

    // 2. Advance level or finalize
    if (request.currentLevel < request.totalLevels) {
      request.currentLevel += 1;
    } else {
      request.status = 'APPROVED';
      await this.executeFinalAction(request);
    }

    return this.approvalRequestRepository.save(request);
  }

  async reject(
    id: string,
    comment: string,
    userId: string,
  ): Promise<ApprovalRequest> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new BusinessException('ERR_AUTH_001');

    const employee = await this.employeeRepository.findOne({
      where: { userId },
    });
    const empId = employee ? employee.id : null;

    const request = await this.approvalRequestRepository.findOne({
      where: { id },
    });
    if (!request) throw new BusinessException('ERR_APPROVAL_003');
    if (request.status !== 'PENDING')
      throw new BusinessException('ERR_APPROVAL_002');

    const config = await this.approvalConfigRepository.findOne({
      where: { transactionType: request.transactionType },
    });
    if (!config) throw new BusinessException('ERR_APPROVAL_004');

    const sequence = (config.approverRolesSequence as string[]) || [];
    const requiredRole = sequence[request.currentLevel - 1];
    if (
      !requiredRole ||
      (user.role !== requiredRole && user.role !== 'ADMIN')
    ) {
      throw new BusinessException('ERR_APPROVAL_001');
    }

    // Save history record
    const history = this.approvalStepHistoryRepository.create({
      requestId: request.id,
      stepLevel: request.currentLevel,
      approverRole: requiredRole,
      approverId: empId,
      action: 'REJECT',
      comment,
    });
    await this.approvalStepHistoryRepository.save(history);

    request.status = 'REJECTED';

    // Revert target resource if applicable
    await this.revertTargetOnReject(request);

    return this.approvalRequestRepository.save(request);
  }

  async getHistory(requestId: string): Promise<ApprovalStepHistory[]> {
    return this.approvalStepHistoryRepository.find({
      where: { requestId },
      relations: { approver: true },
      order: { stepLevel: 'ASC' },
    });
  }

  // ============== FINAL ACTION (State Machine) ==============

  /**
   * Áp dụng hiệu lực khi phiếu duyệt được duyệt hoàn tất
   * Ref: business/03_workflows.md mục 5
   */
  private async executeFinalAction(request: ApprovalRequest): Promise<void> {
    switch (request.transactionType) {
      case 'TIMESHEET':
        await this.applyTimesheetApproved(request);
        break;
      case 'JOB_TRANSFER':
        await this.applyJobTransferApproved(request);
        break;
      case 'SALARY_ADJUSTMENT':
        await this.applySalaryAdjustmentApproved(request);
        break;
      case 'PAYROLL_MONTHLY':
        await this.applyPayrollApproved(request);
        break;
      // DISCIPLINE_REWARD, OFFBOARDING, RESET_PASSWORD, LEAVE_SHORT/LONG: xử lý ở module riêng
      default:
        break;
    }
  }

  private async revertTargetOnReject(request: ApprovalRequest): Promise<void> {
    if (request.transactionType === 'TIMESHEET') {
      const timesheet = await this.timesheetRepository.findOne({
        where: { approvalRequestId: request.id },
      });
      if (timesheet) {
        timesheet.status = 'REJECTED';
        await this.timesheetRepository.save(timesheet);
      }
    }
  }

  private async applyTimesheetApproved(
    request: ApprovalRequest,
  ): Promise<void> {
    const timesheet = await this.timesheetRepository.findOne({
      where: { approvalRequestId: request.id },
    });
    if (timesheet) {
      timesheet.status = 'APPROVED';
      await this.timesheetRepository.save(timesheet);
    }
  }

  /**
   * US-23b: Điều chuyển công tác → cập nhật Employee.departmentId/positionId
   */
  private async applyJobTransferApproved(
    request: ApprovalRequest,
  ): Promise<void> {
    const jobHistory = await this.jobHistoryRepository.findOne({
      where: { approvalRequestId: request.id },
    });
    if (jobHistory && jobHistory.employeeId) {
      await this.employeeRepository.update(jobHistory.employeeId, {
        departmentId: jobHistory.newDepartmentId,
        positionId: jobHistory.newPositionId,
      });
    }
  }

  /**
   * US-23c: Tăng lương → giữ SalaryHistory làm audit; cập nhật Employee.positionId nếu đổi ratio
   */
  private async applySalaryAdjustmentApproved(
    request: ApprovalRequest,
  ): Promise<void> {
    const salaryHistory = await this.salaryHistoryRepository.findOne({
      where: { approvalRequestId: request.id },
    });
    if (!salaryHistory) return;
    // Note: Không đụng Employee vì current schema lưu old/new salary vào SalaryHistory.
    // Payroll calculation sẽ đọc SalaryHistory mới nhất để tính lương.
    // (Ref: business/03_workflows.md mục 9 "Thuật toán tính lương nạp động")
  }

  /**
   * US-25: Chốt bảng lương tháng → chuyển status APPROVED
   */
  private async applyPayrollApproved(request: ApprovalRequest): Promise<void> {
    // Update tất cả Salary có approvalRequestId
    await this.salaryRepository
      .createQueryBuilder()
      .update()
      .set({ status: 'APPROVED' })
      .where('approval_request_id = :id', { id: request.id })
      .execute();
  }
}
