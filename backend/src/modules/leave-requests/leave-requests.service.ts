import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { LeaveRequest } from '../../entities/leave-request.entity';
import { Employee } from '../../entities/employee.entity';
import { User } from '../../entities/user.entity';
import { ApprovalRequest } from '../../entities/approval-request.entity';
import { ApprovalConfig } from '../../entities/approval-config.entity';
import { Notification } from '../../entities/notification.entity';
import { TransactionType } from '../../common/enums/business-values';
import { BusinessException } from '../../common/exceptions/business.exception';
import { notifyApproversForNextLevel } from '../approval/approval.notify-helpers';

interface SubmitLeaveDto {
  leaveType: string;
  startDate: string | Date;
  endDate: string | Date;
  reason?: string;
}

@Injectable()
export class LeaveRequestsService {
  private readonly logger = new Logger(LeaveRequestsService.name);

  constructor(
    @InjectRepository(LeaveRequest)
    private readonly leaveRequestRepository: Repository<LeaveRequest>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(ApprovalRequest)
    private readonly approvalRequestRepository: Repository<ApprovalRequest>,
    @InjectRepository(ApprovalConfig)
    private readonly approvalConfigRepository: Repository<ApprovalConfig>,
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * US-24a/b: Nộp đơn xin nghỉ phép.
   * - ≤ 2 ngày = LEAVE_SHORT → 1 cấp DEPT_LEAD
   * - > 2 ngày = LEAVE_LONG  → 2 cấp DEPT_LEAD → DIRECTOR
   * Validation: balance check cho ANNUAL_LEAVE (trừ vào Employee.annualLeaveBalance).
   */
  async submitLeave(
    dto: SubmitLeaveDto,
    requesterUserId: string,
  ): Promise<{ leaveRequest: LeaveRequest; approvalRequest: ApprovalRequest }> {
    const user = await this.userRepository.findOne({
      where: { id: requesterUserId },
    });
    if (!user) throw new BusinessException('ERR_AUTH_001');

    const employee = await this.employeeRepository.findOne({
      where: { userId: requesterUserId },
    });
    if (!employee) throw new BusinessException('ERR_AUTH_003');

    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      throw new BusinessException('ERR_LEAVE_002');
    }
    const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Balance check cho ANNUAL_LEAVE (US-23a spec §3)
    if (dto.leaveType === 'ANNUAL_LEAVE') {
      const balance = employee.annualLeaveBalance ?? 12;
      if (days > balance) {
        throw new BusinessException('ERR_LEAVE_001', {
          requestedDays: days,
          remainingDays: balance,
        });
      }
    }

    const txType =
      days <= 2 ? TransactionType.LEAVE_SHORT : TransactionType.LEAVE_LONG;

    const config = await this.approvalConfigRepository.findOne({
      where: { transactionType: txType },
    });
    const totalLevels = config?.requiredLevels ?? (days <= 2 ? 1 : 2);
    const approverRolesSequence =
      config?.approverRolesSequence ?? (days <= 2 ? ['DEPT_LEAD'] : ['DEPT_LEAD', 'DIRECTOR']);

    return this.dataSource.transaction(async (manager) => {
      const approvalRepo = manager.getRepository(ApprovalRequest);
      const leaveRepo = manager.getRepository(LeaveRequest);
      const notifRepo = manager.getRepository(Notification);

      // Insert and get generated ID via RETURNING
      const result = await manager
        .createQueryBuilder()
        .insert()
        .into(LeaveRequest)
        .values({
          employeeId: employee.id,
          leaveType: dto.leaveType,
          startDate: start,
          endDate: end,
          reason: dto.reason,
          status: 'PENDING',
        })
        .returning('*')
        .execute();
      
      const savedLeave = result.generatedMaps[0] as LeaveRequest;

      const approvalReq = approvalRepo.create({
        transactionType: txType,
        referenceEntityId: String(savedLeave.id),
        requesterId: employee.id,
        currentLevel: 1,
        totalLevels,
        status: 'PENDING',
      });
      const savedApproval = await approvalRepo.save(approvalReq);

      savedLeave.approvalRequestId = savedApproval.id;
      await leaveRepo.save(savedLeave);

      // Gửi notification cho approver cấp 1
      const firstApproverRole = Array.isArray(approverRolesSequence)
        ? approverRolesSequence[0]
        : approverRolesSequence;
      if (firstApproverRole) {
        await notifyApproversForNextLevel(
          {
            notificationRepo: notifRepo,
            userRepo: manager.getRepository(User),
            employeeRepo: manager.getRepository(Employee),
          },
          savedApproval,
          firstApproverRole,
          txType,
        );
      }

      this.logger.log(
        `Leave submitted: ${savedLeave.id} (${days} ngày, ${txType}, ${totalLevels} cấp)`,
      );
      return { leaveRequest: savedLeave, approvalRequest: savedApproval };
    });
  }

  /**
   * Lấy danh sách đơn nghỉ phép của nhân viên hiện tại.
   */
  async getMyLeaveRequests(userId: string): Promise<LeaveRequest[]> {
    const employee = await this.employeeRepository.findOne({
      where: { userId },
    });
    if (!employee) return [];
    return this.leaveRequestRepository.find({
      where: { employeeId: employee.id },
      order: { startDate: 'DESC' },
    });
  }

  /**
   * HR Manager xem tất cả đơn (gate bên controller).
   */
  async getAllLeaveRequests(): Promise<LeaveRequest[]> {
    return this.leaveRequestRepository.find({
      relations: { employee: true },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Hủy đơn nghỉ phép (chỉ chủ đơn & khi còn PENDING).
   */
  async cancelLeave(id: string, requesterUserId: string): Promise<LeaveRequest> {
    const employee = await this.employeeRepository.findOne({
      where: { userId: requesterUserId },
    });
    if (!employee) throw new BusinessException('ERR_AUTH_001');
    const leave = await this.leaveRequestRepository.findOne({ where: { id } });
    if (!leave) throw new BusinessException('ERR_UNKNOWN');
    if (leave.employeeId !== employee.id) throw new BusinessException('ERR_AUTH_002');
    if (leave.status !== 'PENDING') throw new BusinessException('ERR_LEAVE_003');
    leave.status = 'CANCELLED';
    return this.leaveRequestRepository.save(leave);
  }

  // ─── Helpers dùng từ ApprovalService ───

  /**
   * Apply final-action cho LEAVE_SHORT / LEAVE_LONG (đã wire trong ApprovalService).
   * Helper public để giữ logic trong service này.
   */
  async applyApproved(leaveId: string): Promise<LeaveRequest> {
    const leave = await this.leaveRequestRepository.findOne({
      where: { id: leaveId },
    });
    if (!leave) {
      throw new BusinessException('ERR_UNKNOWN', { leaveId });
    }
    leave.status = 'APPROVED';
    return this.leaveRequestRepository.save(leave);
  }
}
