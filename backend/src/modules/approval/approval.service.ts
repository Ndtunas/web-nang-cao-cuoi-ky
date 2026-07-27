import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApprovalRequest } from '../../entities/approval-request.entity';
import { ApprovalStepHistory } from '../../entities/approval-step-history.entity';
import { ApprovalConfig } from '../../entities/approval-config.entity';
import { Employee } from '../../entities/employee.entity';
import { Timesheet } from '../../entities/timesheet.entity';
import { User } from '../../entities/user.entity';
import { JobHistory } from '../../entities/job-history.entity';
import { SalaryHistory } from '../../entities/salary-history.entity';
import { Salary } from '../../entities/salary.entity';
import { LeaveRequest } from '../../entities/leave-request.entity';
import { OffboardingTask } from '../../entities/offboarding-task.entity';
import { Notification } from '../../entities/notification.entity';
import { EmployeeStatus } from '../../common/enums/business-values';
import { BusinessException } from '../../common/exceptions/business.exception';
import {
  notifyApproversForNextLevel,
  notifyRequesterOfOutcome,
} from './approval.notify-helpers';

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
  private readonly logger = new Logger(ApprovalService.name);

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
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
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
    this.logger.log(`[DEBUG] getPendingMyLevel called for userId=${userId}`);
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new BusinessException('ERR_AUTH_001');
    this.logger.log(`[DEBUG] user.role=${user.role}, user.username=${user.username}`);

    const allPending = await this.approvalRequestRepository.find({
      where: { status: 'PENDING' },
      relations: { requester: true },
    });
    this.logger.log(`[DEBUG] allPending count=${allPending.length}`);

    const configs = await this.approvalConfigRepository.find();
    this.logger.log(`[DEBUG] configs count=${configs.length}, raw=${JSON.stringify(configs.map(c => ({tx: c.transactionType, seq: c.approverRolesSequence, type: typeof c.approverRolesSequence})))}`);
    const configMap = new Map(configs.map((c) => [c.transactionType, c]));

    const result: any[] = [];
    for (const req of allPending) {
      this.logger.log(`[DEBUG] checking req ${req.id} tx=${req.transactionType} level=${req.currentLevel}/${req.totalLevels} requesterId=${req.requesterId}`);
      const config = configMap.get(req.transactionType);
      if (!config) {
        this.logger.warn(`[DEBUG] no config for tx=${req.transactionType}, skipping`);
        continue;
      }

      // Defensive: approverRolesSequence có thể là array hoặc JSON string (driver phụ thuộc).
      let sequence: string[];
      const rawSeq = config.approverRolesSequence;
      if (Array.isArray(rawSeq)) {
        sequence = rawSeq;
      } else if (typeof rawSeq === 'string') {
        try { sequence = JSON.parse(rawSeq); } catch { sequence = []; }
      } else {
        sequence = [];
      }
      this.logger.log(`[DEBUG] parsed sequence for ${req.transactionType} = ${JSON.stringify(sequence)}`);

      const currentRequiredRole = sequence[req.currentLevel - 1];
      if (!currentRequiredRole) {
        this.logger.warn(`[DEBUG] no role at level ${req.currentLevel} (seq len=${sequence.length}), skipping`);
        continue;
      }

      // Match nếu user đúng role, hoặc ADMIN override
      const matches = user.role === currentRequiredRole || user.role === 'ADMIN';
      this.logger.log(`[DEBUG] currentRequiredRole=${currentRequiredRole} matches=${matches}`);
      if (matches) {
        result.push({
          ...req,
          requiredRole: currentRequiredRole,
        });
      }
    }
    this.logger.log(`[DEBUG] result count=${result.length}`);
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
    let finalOutcome: 'APPROVED' | null = null;
    if (request.currentLevel < request.totalLevels) {
      request.currentLevel += 1;
      // US-14: notify next approver level
      try {
        this.logger.log(
          `[ApprovalService] advance level ${request.currentLevel - 1} → ${request.currentLevel} for request ${request.id}`,
        );
        await this.notifyNextApprovers(request, config);
      } catch (err) {
        this.logger.error(
          `Failed to notify next approvers for request ${request.id}: ${(err as Error).message}`,
        );
      }
    } else {
      request.status = 'APPROVED';
      await this.executeFinalAction(request);
      finalOutcome = 'APPROVED';
    }

    const saved = await this.approvalRequestRepository.save(request);
    if (finalOutcome) {
      await this.notifyRequester(saved, finalOutcome);
    }
    return saved;
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

    const saved = await this.approvalRequestRepository.save(request);
    // US-14: notify requester of rejection
    await this.notifyRequester(saved, 'REJECTED');
    return saved;
  }

  async getHistory(requestId: string): Promise<ApprovalStepHistory[]> {
    return this.approvalStepHistoryRepository.find({
      where: { requestId },
      relations: { approver: true },
      order: { stepLevel: 'ASC' },
    });
  }

  async getDetail(requestId: string): Promise<any> {
    const request = await this.approvalRequestRepository.findOne({
      where: { id: requestId },
      relations: { requester: true },
    });
    if (!request) throw new BusinessException('ERR_APPROVAL_003');

    const config = await this.approvalConfigRepository.findOne({
      where: { transactionType: request.transactionType },
    });

    let detail: any = { transactionType: request.transactionType };

    switch (request.transactionType) {
      case 'LEAVE_SHORT':
      case 'LEAVE_LONG': {
        const leave = await this.leaveRequestRepository.findOne({
          where: { approvalRequestId: requestId },
        });
        if (!leave) {
          const candidateId = request.referenceEntityId;
          if (candidateId && /^\d+$/.test(candidateId)) {
            const byId = await this.leaveRequestRepository.findOne({ where: { id: candidateId } });
            if (byId) { detail = { ...detail, ...byId }; break; }
          }
        } else {
          detail = { ...detail, ...leave };
        }
        break;
      }
      case 'JOB_TRANSFER': {
        const jh = await this.jobHistoryRepository.findOne({
          where: { approvalRequestId: requestId },
          relations: { oldDepartment: true, newDepartment: true, oldPosition: true, newPosition: true },
        });
        if (jh) {
          const emp = jh.employeeId
            ? await this.employeeRepository.findOne({ where: { id: jh.employeeId } })
            : null;
          detail = {
            ...detail,
            ...jh,
            employeeName: emp?.fullName || null,
            newDepartmentName: jh.newDepartment?.name || null,
            newPositionName: jh.newPosition?.title || null,
            oldDepartmentName: jh.oldDepartment?.name || null,
            oldPositionName: jh.oldPosition?.title || null,
          };
        }
        break;
      }
      case 'SALARY_ADJUSTMENT': {
        const sh = await this.salaryHistoryRepository.findOne({
          where: { approvalRequestId: requestId },
        });
        if (sh) {
          const emp = sh.employeeId
            ? await this.employeeRepository.findOne({ where: { id: sh.employeeId } })
            : null;
          detail = {
            ...detail,
            ...sh,
            employeeName: emp?.fullName || null,
            oldSalaryAmount: sh.oldBaseSalary,
            newSalaryAmount: sh.newBaseSalary,
          };
        }
        break;
      }
      case 'TIMESHEET': {
        const ts = await this.timesheetRepository.findOne({
          where: { approvalRequestId: requestId },
        });
        if (ts) detail = { ...detail, ...ts };
        break;
      }
      case 'OFFBOARDING': {
        const emp = await this.employeeRepository.findOne({
          where: { id: request.referenceEntityId },
          relations: { department: true },
        });
        if (emp) {
          detail = {
            ...detail,
            employeeName: emp.fullName,
            employeeCode: emp.empCode,
            departmentName: emp.department?.name || emp.departmentId,
            lastWorkingDay: emp.endDate,
          };
        }
        break;
      }
      default:
        detail = { ...detail, referenceEntityId: request.referenceEntityId };
        break;
    }

    return {
      ...request,
      config: config ? { requiredLevels: config.requiredLevels, approverRolesSequence: config.approverRolesSequence } : null,
      detail,
    };
  }

  /**
   * US-14: Notify next-level approvers khi advance level.
   */
  private async notifyNextApprovers(
    request: ApprovalRequest,
    config: ApprovalConfig,
  ): Promise<void> {
    const sequence = (config.approverRolesSequence as string[]) || [];
    const nextRole = sequence[request.currentLevel - 1];
    if (!nextRole) return;
    await notifyApproversForNextLevel(
      {
        notificationRepo: this.notificationRepository,
        userRepo: this.userRepository,
        employeeRepo: this.employeeRepository,
      },
      request,
      nextRole,
      config.transactionType,
    );
  }

  /** US-14: Notify requester of approve/reject outcome. */
  private async notifyRequester(
    request: ApprovalRequest,
    outcome: 'APPROVED' | 'REJECTED',
  ): Promise<void> {
    await notifyRequesterOfOutcome(
      {
        notificationRepo: this.notificationRepository,
        employeeRepo: this.employeeRepository,
      },
      request,
      outcome,
    );
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

        // Cộng lại annual leave balance nếu là ANNUAL_LEAVE
        // (chỉ có hiệu lực khi balance đã được pre-deducted; hiện tại
        //  applyLeaveApproved mới trừ nên reject sau khi approve sẽ refund.
        //  Reject trước khi approve: chưa trừ → không cần cộng.)
        const days =
          Math.floor(
            (new Date(leave.endDate).getTime() -
              new Date(leave.startDate).getTime()) /
              (1000 * 60 * 60 * 24),
          ) + 1;
        if (leave.leaveType === 'ANNUAL_LEAVE') {
          const employee = await this.employeeRepository.findOne({
            where: { id: leave.employeeId },
          });
          if (employee) {
            const balance = employee.annualLeaveBalance ?? 12;
            employee.annualLeaveBalance = balance + days;
            await this.employeeRepository.save(employee);
          }
        }
      }
      return;
    }

    // Offboarding: nếu đã chuyển NOTICE_PERIOD thì revert lại OFFICIAL
    if (request.transactionType === 'OFFBOARDING') {
      await this.revertOffboardingApproved(request);
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
   * Ưu tiên tra theo approvalRequestId (đã được bind khi submit), fallback theo referenceEntityId
   * nếu dữ liệu cũ chưa bind. Log cảnh báo khi không tìm thấy.
   */
  private async applyLeaveApproved(request: ApprovalRequest): Promise<void> {
    let leave: LeaveRequest | null = await this.leaveRequestRepository.findOne({
      where: { approvalRequestId: request.id },
    });

    if (!leave) {
      const candidateId = request.referenceEntityId;
      if (candidateId && /^\d+$/.test(candidateId)) {
        leave = await this.leaveRequestRepository.findOne({
          where: { id: candidateId },
        });
      }
    }

    if (!leave) {
      console.warn(
        `[ApprovalService] LeaveRequest not found for approval request ${request.id} ` +
          `(ref=${request.referenceEntityId}). Leave status will remain unchanged.`,
      );
      return;
    }

    leave.status = 'APPROVED';
    await this.leaveRequestRepository.save(leave);

    // Trừ annual leave balance nếu là ANNUAL_LEAVE (US-23a)
    if (leave.leaveType === 'ANNUAL_LEAVE') {
      const days =
        Math.floor(
          (new Date(leave.endDate).getTime() -
            new Date(leave.startDate).getTime()) /
            (1000 * 60 * 60 * 24),
        ) + 1;
      const employee = await this.employeeRepository.findOne({
        where: { id: leave.employeeId },
      });
      if (employee) {
        const balance = employee.annualLeaveBalance ?? 12;
        employee.annualLeaveBalance = Math.max(0, balance - days);
        await this.employeeRepository.save(employee);
      }
    }
  }

  /**
   * PERSONAL_INFO_CHANGE: parse snapshot từ `referenceEntityId` (format
   * `employeeId:JSON_snapshot`) và apply các trường được phép lên Employee.
   */
  private async applyPersonalInfoChangeApproved(
    request: ApprovalRequest,
  ): Promise<void> {
    const raw = request.referenceEntityId;
    if (!raw || !raw.includes(':')) return;
    const sepIdx = raw.indexOf(':');
    const employeeId = raw.substring(0, sepIdx);
    const json = raw.substring(sepIdx + 1);

    let snapshot: Record<string, any>;
    try {
      snapshot = JSON.parse(json);
    } catch {
      console.warn(
        `Malformed PERSONAL_INFO_CHANGE snapshot for request#${request.id}`,
      );
      return;
    }

    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId },
    });
    if (!employee) return;

    if (snapshot.email !== undefined && snapshot.email !== employee.email) {
      const existing = await this.employeeRepository.findOne({
        where: { email: snapshot.email },
      });
      if (existing && existing.id !== employeeId) {
        console.warn(
          `Email ${snapshot.email} already used, skip applyPersonalInfoChange`,
        );
        return;
      }
      employee.email = snapshot.email;
    }
    if (snapshot.phone !== undefined) employee.phone = snapshot.phone;
    if (snapshot.address !== undefined) employee.address = snapshot.address;
    if (snapshot.bankAccount !== undefined)
      employee.bankAccount = snapshot.bankAccount;
    if (snapshot.taxCode !== undefined) employee.taxCode = snapshot.taxCode;

    await this.employeeRepository.save(employee);
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

  /** Revert offboarding: restore employee to OFFICIAL and remove auto-created tasks */
  private async revertOffboardingApproved(request: ApprovalRequest): Promise<void> {
    const refId = request.referenceEntityId;
    if (refId) {
      const employee = await this.employeeRepository.findOne({
        where: { id: refId },
      });
      if (employee && employee.status === EmployeeStatus.NOTICE_PERIOD) {
        employee.status = EmployeeStatus.OFFICIAL;
        await this.employeeRepository.save(employee);
      }
    }
    await this.offboardingTaskRepository.delete({
      employeeId: refId,
    } as any);
  }
}
