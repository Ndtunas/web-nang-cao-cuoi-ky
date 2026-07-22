import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnboardingTask } from '../../entities/onboarding-task.entity.js';
import { Employee } from '../../entities/employee.entity.js';
import { User } from '../../entities/user.entity.js';
import { EmployeeStatus } from '../../common/enums/business-values.js';
import { BusinessException } from '../../common/exceptions/business.exception.js';

interface InitiateDto {
  employeeId: string;
  dueDate?: string | Date;
}

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    @InjectRepository(OnboardingTask)
    private readonly onboardingTaskRepository: Repository<OnboardingTask>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * US-15: HR Manager khởi tạo onboarding cho nhân viên mới →
   *   - Set Employee.status = ONBOARDING
   *   - Seed 4 OnboardingTask cho HR/IT/Admin (delegate theo phòng ban)
   */
  async initiateOnboarding(
    dto: InitiateDto,
    requesterUserId: string,
  ): Promise<{ employee: Employee; tasks: OnboardingTask[] }> {
    const requester = await this.userRepository.findOne({
      where: { id: requesterUserId },
    });
    if (!requester) throw new BusinessException('ERR_AUTH_001');

    const employee = await this.employeeRepository.findOne({
      where: { id: dto.employeeId },
    });
    if (!employee) throw new BusinessException('ERR_AUTH_003');

    if (employee.status !== EmployeeStatus.ONBOARDING) {
      employee.status = EmployeeStatus.ONBOARDING;
      await this.employeeRepository.save(employee);
    }

    const dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    const seedTitles: Array<{ title: string; dept: string }> = [
      { title: 'Thu thập hồ sơ, ký HĐLĐ, đăng ký MST', dept: 'HR' },
      { title: 'Cấp máy tính, Email, Git', dept: 'IT' },
      { title: 'Chuẩn bị chỗ ngồi, thẻ ra vào', dept: 'ADMIN' },
      { title: 'Đánh giá thử việc sau 30 ngày', dept: 'HR' },
    ];

    const tasks: OnboardingTask[] = [];
    for (const seed of seedTitles) {
      const task = this.onboardingTaskRepository.create({
        employeeId: employee.id,
        taskTitle: seed.title,
        targetDepartment: seed.dept,
        assignedById: requester.id,
        status: 'PENDING',
        dueDate,
      } as Partial<OnboardingTask>);
      const saved = await this.onboardingTaskRepository.save(task);
      tasks.push(saved);
    }
    this.logger.log(
      `Onboarding initiated for emp#${employee.id} with ${tasks.length} tasks`,
    );
    return { employee, tasks };
  }

  /**
   * US-16/17: Lấy task cho IT/Admin staff (theo targetDepartment).
   */
  async getTasksForDepartment(department: string): Promise<OnboardingTask[]> {
    return this.onboardingTaskRepository.find({
      where: { targetDepartment: department, status: 'PENDING' },
      relations: { employee: true },
      order: { dueDate: 'ASC' },
    });
  }

  async getAllPendingTasks(): Promise<OnboardingTask[]> {
    return this.onboardingTaskRepository.find({
      where: { status: 'PENDING' },
      relations: { employee: true },
      order: { createdAt: 'ASC' },
    });
  }

  async getTasksByEmployee(employeeId: string): Promise<OnboardingTask[]> {
    return this.onboardingTaskRepository.find({
      where: { employeeId },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Hoàn tất task onboarding (US-16/17).
   */
  async completeTask(
    taskId: string,
    userId: string,
  ): Promise<OnboardingTask> {
    const task = await this.onboardingTaskRepository.findOne({
      where: { id: taskId },
    });
    if (!task) throw new BusinessException('ERR_UNKNOWN');
    task.status = 'COMPLETED';
    task.completedAt = new Date();
    task.assigneeId = userId;
    return this.onboardingTaskRepository.save(task);
  }

  /**
   * US-18: HR Manager đánh giá đạt thử việc → chuyển sang OFFICIAL.
   */
  async promoteToOfficial(employeeId: string): Promise<Employee> {
    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId },
      relations: { department: true, position: true, user: true },
    });
    if (!employee) throw new BusinessException('ERR_AUTH_003');
    if (
      employee.status !== EmployeeStatus.ONBOARDING &&
      employee.status !== EmployeeStatus.PROBATION
    ) {
      throw new BusinessException('ERR_EMP_001');
    }
    employee.status = EmployeeStatus.OFFICIAL;
    const saved = await this.employeeRepository.save(employee);
    this.logger.log(`Employee #${employee.id} promoted to OFFICIAL`);
    return saved;
  }

  async checkAllCompleted(employeeId: string): Promise<boolean> {
    const tasks = await this.onboardingTaskRepository.find({
      where: { employeeId },
    });
    return tasks.length > 0 && tasks.every((t) => t.status === 'COMPLETED');
  }
}
