import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { OffboardingTask } from '../../entities/offboarding-task.entity.js';
import { Employee } from '../../entities/employee.entity.js';
import { User } from '../../entities/user.entity.js';
import { ApprovalRequest } from '../../entities/approval-request.entity.js';
import { ApprovalConfig } from '../../entities/approval-config.entity.js';
import {
  EmployeeStatus,
  TransactionType,
  UserRole,
} from '../../common/enums/business-values.js';
import { BusinessException } from '../../common/exceptions/business.exception.js';

@Injectable()
export class OffboardingService {
  private readonly logger = new Logger(OffboardingService.name);

  constructor(
    @InjectRepository(OffboardingTask)
    private readonly offboardingTaskRepository: Repository<OffboardingTask>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(ApprovalRequest)
    private readonly approvalRequestRepository: Repository<ApprovalRequest>,
    @InjectRepository(ApprovalConfig)
    private readonly approvalConfigRepository: Repository<ApprovalConfig>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * US-19/20: Nộp đơn xin thôi việc → tạo ApprovalRequest OFFBOARDING 3 cấp
   * (DEPT_LEAD → DIRECTOR → CHAIRMAN) + set Employee.status = NOTICE_PERIOD.
   */
  async submitResignation(
    reason: string,
    requesterUserId: string,
  ): Promise<{ approvalRequest: ApprovalRequest }> {
    const user = await this.userRepository.findOne({
      where: { id: requesterUserId },
    });
    if (!user) throw new BusinessException('ERR_AUTH_001');
    const employee = await this.employeeRepository.findOne({
      where: { userId: requesterUserId },
    });
    if (!employee) throw new BusinessException('ERR_AUTH_003');

    if (
      employee.status === EmployeeStatus.TERMINATED ||
      employee.status === EmployeeStatus.NOTICE_PERIOD
    ) {
      throw new BusinessException('ERR_EMP_002');
    }

    const config = await this.approvalConfigRepository.findOne({
      where: { transactionType: TransactionType.OFFBOARDING },
    });
    const totalLevels = config?.requiredLevels ?? 3;

    return this.dataSource.transaction(async (manager) => {
      const empRepo = manager.getRepository(Employee);
      const approvalRepo = manager.getRepository(ApprovalRequest);

      empRepo.update(employee.id, { status: EmployeeStatus.NOTICE_PERIOD });

      const approvalReq = approvalRepo.create({
        transactionType: TransactionType.OFFBOARDING,
        referenceEntityId: employee.id,
        requesterId: employee.id,
        currentLevel: 1,
        totalLevels,
        status: 'PENDING',
      });
      const saved = await approvalRepo.save(approvalReq);
      this.logger.log(
        `Resignation submitted by emp#${employee.id} (3-level approval)`,
      );
      return { approvalRequest: saved };
    });
  }

  /**
   * US-21: Lấy danh sách OffboardingTask theo nhân viên (gate admin/lead).
   */
  async getTasksByEmployee(employeeId: string): Promise<OffboardingTask[]> {
    return this.offboardingTaskRepository.find({
      where: { employeeId },
      order: { createdAt: 'ASC' },
    });
  }

  async getAllPendingTasks(): Promise<OffboardingTask[]> {
    return this.offboardingTaskRepository.find({
      where: { status: 'PENDING' },
      relations: { employee: true },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * US-21: Hoàn tất 1 task offboarding (IT/Admin).
   */
  async completeTask(
    taskId: string,
    userId: string,
  ): Promise<OffboardingTask> {
    const task = await this.offboardingTaskRepository.findOne({
      where: { id: taskId },
    });
    if (!task) throw new BusinessException('ERR_UNKNOWN');
    task.status = 'COMPLETED';
    task.completedAt = new Date();
    task.assigneeId = userId;
    return this.offboardingTaskRepository.save(task);
  }

  /**
   * US-22: Sau khi tất cả task xong → finalize settlement (ghi audit, no-op data).
   */
  async checkAllCompleted(employeeId: string): Promise<boolean> {
    const tasks = await this.offboardingTaskRepository.find({
      where: { employeeId },
    });
    return tasks.length > 0 && tasks.every((t) => t.status === 'COMPLETED');
  }
}
