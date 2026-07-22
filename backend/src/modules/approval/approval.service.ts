import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApprovalRequest } from '../../entities/approval-request.entity.js';
import { ApprovalStepHistory } from '../../entities/approval-step-history.entity.js';
import { ApprovalConfig } from '../../entities/approval-config.entity.js';
import { Employee } from '../../entities/employee.entity.js';
import { Timesheet } from '../../entities/timesheet.entity.js';
import { User } from '../../entities/user.entity.js';
import { BusinessException } from '../../common/exceptions/business.exception.js';

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
  ) {}

  async getApprovalConfigs(): Promise<ApprovalConfig[]> {
    return this.approvalConfigRepository.find();
  }

  async updateApprovalConfig(transactionType: string, requiredLevels: number): Promise<ApprovalConfig> {
    const config = await this.approvalConfigRepository.findOne({ where: { transactionType } });
    if (!config) {
      throw new BusinessException('ERR_UNKNOWN');
    }
    config.requiredLevels = requiredLevels;
    // Adjust roles sequence length accordingly
    const roles = ['DEPT_LEAD', 'DIRECTOR', 'CHAIRMAN'];
    config.approverRolesSequence = roles.slice(0, requiredLevels);
    return this.approvalConfigRepository.save(config);
  }

  async getPendingMyLevel(userId: string): Promise<any[]> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new BusinessException('ERR_AUTH_001');

    // Get all pending approval requests
    const allPending = await this.approvalRequestRepository.find({
      where: { status: 'PENDING' },
      relations: { requester: true },
    });

    const configs = await this.approvalConfigRepository.find();
    const configMap = new Map(configs.map(c => [c.transactionType, c]));

    const result: any[] = [];
    for (const req of allPending) {
      const config = configMap.get(req.transactionType);
      if (!config) continue;

      const currentRequiredRole = config.approverRolesSequence[req.currentLevel - 1];
      
      // If current user has the role required at this step, include it
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
    const employee = await this.employeeRepository.findOne({ where: { userId } });
    if (!employee) return [];

    return this.approvalRequestRepository.find({
      where: { requesterId: employee.id },
      relations: { requester: true },
      order: { createdAt: 'DESC' },
    });
  }

  async approve(id: string, comment: string, userId: string): Promise<ApprovalRequest> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new BusinessException('ERR_AUTH_001');

    const employee = await this.employeeRepository.findOne({ where: { userId } });
    const empId = employee ? employee.id : null;

    const request = await this.approvalRequestRepository.findOne({ where: { id } });
    if (!request) throw new BusinessException('ERR_UNKNOWN');
    if (request.status !== 'PENDING') throw new BusinessException('ERR_APPROVAL_002');

    const config = await this.approvalConfigRepository.findOne({
      where: { transactionType: request.transactionType },
    });
    if (!config) throw new BusinessException('ERR_UNKNOWN');

    const requiredRole = config.approverRolesSequence[request.currentLevel - 1];
    if (user.role !== requiredRole && user.role !== 'ADMIN') {
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

    // 2. Advance level or final approve
    if (request.currentLevel < request.totalLevels) {
      request.currentLevel += 1;
    } else {
      request.status = 'APPROVED';
      await this.executeFinalAction(request);
    }

    return this.approvalRequestRepository.save(request);
  }

  async reject(id: string, comment: string, userId: string): Promise<ApprovalRequest> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new BusinessException('ERR_AUTH_001');

    const employee = await this.employeeRepository.findOne({ where: { userId } });
    const empId = employee ? employee.id : null;

    const request = await this.approvalRequestRepository.findOne({ where: { id } });
    if (!request) throw new BusinessException('ERR_UNKNOWN');
    if (request.status !== 'PENDING') throw new BusinessException('ERR_APPROVAL_002');

    const config = await this.approvalConfigRepository.findOne({
      where: { transactionType: request.transactionType },
    });
    if (!config) throw new BusinessException('ERR_UNKNOWN');

    const requiredRole = config.approverRolesSequence[request.currentLevel - 1];
    if (user.role !== requiredRole && user.role !== 'ADMIN') {
      throw new BusinessException('ERR_APPROVAL_001');
    }

    // 1. Save history record
    const history = this.approvalStepHistoryRepository.create({
      requestId: request.id,
      stepLevel: request.currentLevel,
      approverRole: requiredRole,
      approverId: empId,
      action: 'REJECT',
      comment,
    });
    await this.approvalStepHistoryRepository.save(history);

    // 2. Set request status to rejected
    request.status = 'REJECTED';

    // 3. Update target resource status if timesheet
    if (request.transactionType === 'TIMESHEET') {
      const timesheet = await this.timesheetRepository.findOne({
        where: { approvalRequestId: request.id },
      });
      if (timesheet) {
        timesheet.status = 'REJECTED';
        await this.timesheetRepository.save(timesheet);
      }
    }

    return this.approvalRequestRepository.save(request);
  }

  async getHistory(requestId: string): Promise<ApprovalStepHistory[]> {
    return this.approvalStepHistoryRepository.find({
      where: { requestId },
      relations: { approver: true },
      order: { stepLevel: 'ASC' },
    });
  }

  private async executeFinalAction(request: ApprovalRequest) {
    if (request.transactionType === 'TIMESHEET') {
      const timesheet = await this.timesheetRepository.findOne({
        where: { approvalRequestId: request.id },
      });
      if (timesheet) {
        timesheet.status = 'APPROVED';
        await this.timesheetRepository.save(timesheet);
      }
    } else if (request.transactionType === 'JOB_TRANSFER') {
      // Find history and update employee positions
      // Wait, let's load job history dynamically
      const manager = this.approvalRequestRepository.manager;
      const jobHistory = await manager.findOne('JobHistory', {
        where: { approvalRequestId: request.id },
      } as any) as any;
      if (jobHistory) {
        await this.employeeRepository.update(jobHistory.employeeId, {
          departmentId: jobHistory.newDepartmentId,
          positionId: jobHistory.newPositionId,
        });
      }
    } else if (request.transactionType === 'SALARY_ADJUSTMENT') {
      // Find salary history
      const manager = this.approvalRequestRepository.manager;
      const salHistory = await manager.findOne('SalaryHistory', {
        where: { approvalRequestId: request.id },
      } as any) as any;
      if (salHistory) {
        // Adjust ratio or other stats if position_id can be updated
        // For salary details, let's keep it saved in salary_histories so payroll calculates it
      }
    }
  }
}
