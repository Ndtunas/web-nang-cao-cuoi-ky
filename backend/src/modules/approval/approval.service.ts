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
import { LeaveRequest } from '../../entities/leave-request.entity.js';
import { OffboardingTask } from '../../entities/offboarding-task.entity.js';
import { EmployeeStatus } from '../../common/enums/business-values.js';
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
    @InjectRepository(LeaveRequest)
    private readonly leaveRequestRepository: Repository<LeaveRequest>,
    @InjectRepository(OffboardingTask)
    private readonly offboardingTaskRepository: Repository<OffboardingTask>,
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
      case 'LEAVE_SHORT':
      case 'LEAVE_LONG':
        await this.applyLeaveApproved(request);
        break;
      case 'PERSONAL_INFO_CHANGE':
        await this.applyPersonalInfoChangeApproved(request);
        break;
      case 'DISCIPLINE_REWARD':
        await this.applyDisciplineRewardApproved(request);
        break;
      case 'OFFBOARDING':
        await this.applyOffboardingApproved(request);
        break;
      // RESET_PASSWORD: handled directly inside auth.service.approvePasswordReset()
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
      return;
    }

    // Leave requests: revert PENDING -> REJECTED on the leave record
    if (
      request.transactionType === 'LEAVE_SHORT' ||
      request.transactionType === 'LEAVE_LONG'
    ) {
      const leave = await this.leaveRequestRepository.findOne({
        where: { approvalRequestId: request.id },
      });
      if (leave) {
        leave.status = 'REJECTED';
        await this.leaveRequestRepository.save(leave);
      }
      return;
    }

    // Offboarding: nếu đã chuyển NOTICE_PERIOD thì revert lại OFFICIAL
    if (request.transactionType === 'OFFBOARDING') {
      const refId = request.referenceEntityId;
      const employeeIdMatch = refId?.match?.(/^EMP-([\w-]+)/);
      if (refId) {
        const employee = await this.employeeRepository.findOne({
          where: { id: refId },
        });
        if (employee && employee.status === EmployeeStatus.NOTICE_PERIOD) {
          employee.status = EmployeeStatus.OFFICIAL;
          await this.employeeRepository.save(employee);
        }
      }
      // Remove any auto-created OffboardingTask
      await this.offboardingTaskRepository.delete({
        employeeId: request.referenceEntityId,
      });
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

  /**
   * US-24 (Leave): Đơn nghỉ phép ngắn/dài ngày được duyệt → cập nhật LeaveRequest.status = APPROVED.
   * Vì LeaveRequest.approvalRequestId hiện chưa được bind khi submit (module leave-requests là stub),
   * cố gắng tra theo referenceEntityId trước, fallback tra theo requester gần nhất.
   */
  private async applyLeaveApproved(request: ApprovalRequest): Promise<void> {
    const candidateId = request.referenceEntityId;
    let leave: LeaveRequest | null = null;
    if (candidateId && /^\d+$/.test(candidateId)) {
      leave = await this.leaveRequestRepository.findOne({
        where: { id: candidateId },
      });
    }
    if (!leave) {
      // Tra theo approvalRequestId (khi leave module bind đúng)
      leave = await this.leaveRequestRepository.findOne({
        where: { approvalRequestId: request.id },
      });
    }
    if (leave) {
      leave.status = 'APPROVED';
      await this.leaveRequestRepository.save(leave);
    }
  }

  /**
   * PERSONAL_INFO_CHANGE: chỉ là audit — updatePersonalInfo() đã ghi trực tiếp
   * vào Employee. ApprovalRequest chỉ mang ý nghĩa duyệt bước cuối; không đụng Employee ở đây.
   */
  private async applyPersonalInfoChangeApproved(
    _request: ApprovalRequest,
  ): Promise<void> {
    // No-op: data đã được commit sẵn ở updatePersonalInfo() và audit interceptor đã bắt diff.
  }

  /**
   * DISCIPLINE_REWARD: chỉ ghi nhận audit, không tác động Employee state.
   * referenceEntityId lưu "empId:type:amount:ts". Hành động đã được submit lưu thành
   * ApprovalRequest ở employees.service.ts; approver duyệt ⇒ status chuyển APPROVED
   * mà không cần đụng entity riêng.
   */
  private async applyDisciplineRewardApproved(
    _request: ApprovalRequest,
  ): Promise<void> {
    // No-op: chỉ để state machine ghi nhận hoàn tất.
  }

  /**
   * US-19..22: Offboarding được duyệt → set Employee.status = TERMINATED + endDate = today,
   * đồng thời seed các OffboardingTask thu hồi tài sản/bàn giao cho IT & Admin.
   * Ref: business/03_workflows.md mục 7.
   */
  private async applyOffboardingApproved(request: ApprovalRequest): Promise<void> {
    const employeeId = request.referenceEntityId;
    if (!employeeId) return;
    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId },
    });
    if (!employee) return;
    const today = new Date();
    employee.status = EmployeeStatus.TERMINATED;
    employee.endDate = today;
    await this.employeeRepository.save(employee);

    // Seed offboarding tasks (3 nghiệp vụ thu hồi theo workflow mục 7)
    const taskSeeds: Array<{
      taskTitle: string;
      targetDepartment: string;
    }> = [
      {
        taskTitle: 'Thu hồi máy tính, khóa Email/Git',
        targetDepartment: 'IT',
      },
      { taskTitle: 'Thu hồi thẻ ra vào, tủ đựng đồ', targetDepartment: 'ADMIN' },
      { taskTitle: 'Bàn giao dự án & tài liệu', targetDepartment: 'DEPT' },
    ];
    for (const seed of taskSeeds) {
      const task = this.offboardingTaskRepository.create({
        employeeId: employee.id,
        taskTitle: seed.taskTitle,
        targetDepartment: seed.targetDepartment,
        status: 'PENDING',
      });
      await this.offboardingTaskRepository.save(task);
    }
  }
}
