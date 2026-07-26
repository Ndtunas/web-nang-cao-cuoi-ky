import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { OnboardingTask } from '../../entities/onboarding-task.entity.js';
import { Employee } from '../../entities/employee.entity.js';
import { User } from '../../entities/user.entity.js';
import { EmployeeStatus, UserRole } from '../../common/enums/business-values.js';
import { BusinessException } from '../../common/exceptions/business.exception.js';

interface EmployeeDto {
  fullName: string;
  email: string;
  phone?: string;
  gender?: string;
  dob?: string;
  address?: string;
  taxCode?: string;
  bankName?: string;
  bankAccount?: string;
  joinDate?: string;
  departmentId?: string;
  positionId?: string;
}

interface InitiateDto {
  employee?: EmployeeDto; // Nếu truyền employee → tạo mới. Nếu truyền employeeId → dùng employee đã có
  employeeId?: string;    // Employee đã tồn tại
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
   *   - Nếu truyền `employee` → tạo mới Employee + User, rồi seed 4 tasks
   *   - Nếu truyền `employeeId` → dùng employee đã có, chỉ seed tasks
   *   - Set Employee.status = ONBOARDING
   */
  async initiateOnboarding(
    dto: InitiateDto,
    requesterUserId: string,
  ): Promise<{ employee: Employee; tasks: OnboardingTask[] }> {
    const requester = await this.userRepository.findOne({
      where: { id: requesterUserId },
    });
    if (!requester) throw new BusinessException('ERR_AUTH_001');

    // onboarding_tasks.assigned_by_id FK → employees(id), không phải users(id).
    // Tra cứu employee tương ứng của requester (nếu có). Nếu không có thì để null.
    const requesterEmployee = await this.employeeRepository.findOne({
      where: { userId: requester.id },
    });
    const assignedById = requesterEmployee?.id ?? null;

    let employee: Employee;

    // Case 1: Tạo employee mới
    if (dto.employee) {
      const { employee: newEmp } = await this.createEmployeeAndUser(dto.employee);
      employee = newEmp;
    }
    // Case 2: Dùng employee đã có
    else if (dto.employeeId) {
      const found = await this.employeeRepository.findOne({
        where: { id: dto.employeeId },
      });
      if (!found) throw new BusinessException('ERR_AUTH_003');
      employee = found;
    } else {
      throw new BusinessException('ERR_EMP_001'); // Missing employee or employeeId
    }

    // Set status = ONBOARDING
    employee.status = EmployeeStatus.ONBOARDING;
    await this.employeeRepository.save(employee);

    // Seed 4 OnboardingTask cho HR/IT/Admin
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
        assignedById,
        status: 'PENDING',
        dueDate,
      } as Partial<OnboardingTask>);
      const saved = await this.onboardingTaskRepository.save(task);
      tasks.push(saved);
    }

    this.logger.log(
      `Onboarding initiated for emp#${employee.id} (${employee.fullName}) with ${tasks.length} tasks`,
    );
    return { employee, tasks };
  }

  /**
   * Tạo Employee + User account trong 1 transaction
   */
  private async createEmployeeAndUser(dto: EmployeeDto): Promise<{ employee: Employee }> {
    // Check email unique
    const existing = await this.employeeRepository.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      throw new BusinessException('ERR_EMP_001');
    }

    // Tạo username từ email
    const baseUsername = dto.email.split('@')[0];
    let username = baseUsername;
    let userExists = await this.userRepository.findOne({ where: { username } });
    let counter = 1;
    while (userExists) {
      username = `${baseUsername}${counter}`;
      userExists = await this.userRepository.findOne({ where: { username } });
      counter++;
    }

    // Password hash: empCode sẽ update sau khi có empCode từ trigger
    const dobStr = dto.dob ? this.formatDob(dto.dob) : '19950101';
    const tempRawPass = `${username}@Temp${dobStr}`;
    const passwordHash = await bcrypt.hash(tempRawPass, 10);

    const user = this.userRepository.create({
      username,
      passwordHash,
      role: UserRole.EMPLOYEE,
      status: 'ACTIVE',
    });
    await this.userRepository.save(user);

    // Re-fetch user bằng username (UNIQUE) để lấy id do DB default cấp
    const savedUser = await this.userRepository.findOne({
      where: { username },
    });
    if (!savedUser) throw new BusinessException('ERR_UNKNOWN');

    // Tạo Employee
    const employee = this.employeeRepository.create({
      fullName: dto.fullName,
      email: dto.email,
      phone: dto.phone,
      gender: dto.gender,
      dob: dto.dob ? new Date(dto.dob) : undefined,
      address: dto.address,
      taxCode: dto.taxCode,
      bankName: dto.bankName,
      bankAccount: dto.bankAccount,
      joinDate: dto.joinDate ? new Date(dto.joinDate) : new Date(),
      status: EmployeeStatus.ONBOARDING,
      departmentId: dto.departmentId,
      positionId: dto.positionId,
      userId: savedUser.id,
    });
    await this.employeeRepository.save(employee);

    // Re-fetch bằng email (UNIQUE) vì @PrimaryColumn không tự lấy lại id từ DB
    // sau khi insert với DEFAULT fn_generate_snowflake_id().
    const foundEmp = await this.employeeRepository.findOne({
      where: { email: dto.email },
      relations: { department: true, position: true, user: true },
    });
    if (!foundEmp) throw new BusinessException('ERR_UNKNOWN');

    // Re-hash password theo spec: Temp@{empCode}
    if (savedUser && foundEmp.empCode) {
      const defaultPassword = `Temp@${foundEmp.empCode}`;
      const properPlaintext = `${foundEmp.empCode}${defaultPassword}${dobStr}`;
      savedUser.passwordHash = await bcrypt.hash(properPlaintext, 10);
      await this.userRepository.save(savedUser);
    }

    return { employee: foundEmp };
  }

  private formatDob(dob: string | Date): string {
    if (!dob) return '';
    const d = typeof dob === 'string' ? new Date(dob) : dob;
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
   * Phòng nào chỉ duyệt được task thuộc đúng phòng đó
   * (HR chỉ duyệt task target_department = 'HR', IT chỉ duyệt 'IT'...).
   * ADMIN có quyền override để xử lý task không thuộc phòng nào
   * (vd target_department = 'ADMIN' không khớp dept_code nào).
   */
  async completeTask(
    taskId: string,
    userId: string,
  ): Promise<OnboardingTask> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new BusinessException('ERR_AUTH_001');

    const task = await this.onboardingTaskRepository.findOne({
      where: { id: taskId },
    });
    if (!task) throw new BusinessException('ERR_UNKNOWN');

    // Chỉ xử lý các task còn ở trạng thái PENDING (chống "complete" 2 lần).
    if (task.status !== 'PENDING') {
      throw new BusinessException('ERR_APPROVAL_002');
    }

    // Lấy Employee kèm phòng ban của user đang đăng nhập.
    // ADMIN: không bắt buộc có Employee record (vì admin user có thể
    // không liên kết employee). Vẫn lookup để ghi assigneeId nếu có.
    let employee: Employee | null = null;
    if (user.role !== UserRole.ADMIN) {
      employee = await this.employeeRepository.findOne({
        where: { userId },
        relations: { department: true },
      });
      if (!employee) {
        throw new BusinessException('ERR_AUTH_003');
      }
    } else {
      employee = await this.employeeRepository.findOne({
        where: { userId },
        relations: { department: true },
      });
    }

    // Phòng nào chỉ duyệt được task thuộc đúng phòng đó.
    // ADMIN được bypass để xử lý case đặc biệt (vd target_department = 'ADMIN'
    // không khớp dept_code nào, hoặc admin không có employee record).
    if (user.role !== UserRole.ADMIN && employee) {
      const userDeptCode = employee.department?.deptCode;
      if (!userDeptCode || userDeptCode !== task.targetDepartment) {
        throw new BusinessException('ERR_AUTH_002', {
          targetDepartment: task.targetDepartment,
        });
      }
    }

    task.status = 'COMPLETED';
    task.completedAt = new Date();

    // assignee_id FK -> employees.id (nullable). Chỉ set khi user có employee record.
    if (employee) {
      task.assigneeId = employee.id;
    }

    const savedTask = await this.onboardingTaskRepository.save(task);

    // Tự động kiểm tra: nếu đây là task cuối cùng và tất cả đã COMPLETED
    // → chuyển trạng thái nhân viên sang OFFICIAL.
    await this.autoPromoteIfAllTasksCompleted(task.employeeId);

    return savedTask;
  }

  /**
   * Nếu tất cả onboarding tasks của nhân viên đã COMPLETED → tự động
   * promote sang OFFICIAL (US-18). Bỏ qua nếu nhân viên đã OFFICIAL rồi
   * hoặc không còn ở trạng thái ONBOARDING/PROBATION.
   */
  private async autoPromoteIfAllTasksCompleted(employeeId: string): Promise<void> {
    try {
      const allDone = await this.checkAllCompleted(employeeId);
      if (!allDone) return;

      const employee = await this.employeeRepository.findOne({
        where: { id: employeeId },
      });
      if (!employee) return;

      if (
        employee.status !== EmployeeStatus.ONBOARDING &&
        employee.status !== EmployeeStatus.PROBATION
      ) {
        return;
      }

      employee.status = EmployeeStatus.OFFICIAL;
      await this.employeeRepository.save(employee);
      this.logger.log(
        `Employee #${employee.id} (${employee.fullName}) auto-promoted to OFFICIAL (all ${await this.countTasks(employeeId)} tasks completed)`,
      );
    } catch (err) {
      this.logger.warn(
        `autoPromoteIfAllTasksCompleted failed for emp#${employeeId}: ${(err as Error).message}`,
      );
    }
  }

  private async countTasks(employeeId: string): Promise<number> {
    return this.onboardingTaskRepository.count({ where: { employeeId } });
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
