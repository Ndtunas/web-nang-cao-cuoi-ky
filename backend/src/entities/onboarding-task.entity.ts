import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Employee } from './employee.entity.js';

/**
 * Bảng 14: onboarding_tasks
 * Ref: database/03_schema.sql line 323-335
 */
@Entity('onboarding_tasks')
export class OnboardingTask {
  @PrimaryColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint', name: 'employee_id' })
  employeeId: string;

  @Column({ type: 'varchar', length: 150, name: 'task_title' })
  taskTitle: string;

  @Column({ type: 'varchar', length: 20, name: 'target_department' })
  targetDepartment: string;

  @Column({ type: 'bigint', nullable: true, name: 'assigned_by_id' })
  assignedById: string;

  @Column({ type: 'bigint', nullable: true, name: 'assignee_id' })
  assigneeId: string;

  @Column({ type: 'date', nullable: true, name: 'due_date' })
  dueDate: Date;

  @Column({ type: 'varchar', length: 20, default: 'PENDING' })
  status: string;

  @Column({ type: 'timestamptz', nullable: true, name: 'completed_at' })
  completedAt: Date;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Employee, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'assigned_by_id' })
  assignedBy: Employee;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'assignee_id' })
  assignee: Employee;
}
