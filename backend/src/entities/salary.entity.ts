import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Employee } from './employee.entity.js';
import { ApprovalRequest } from './approval-request.entity.js';

/** Bảng 21: salaries — Ref: schema.sql line 418-438 */
@Entity('salaries')
export class Salary {
  @PrimaryColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true, name: 'payroll_code' })
  payrollCode: string;

  @Column({ type: 'bigint', name: 'employee_id' })
  employeeId: string;

  @Column({ type: 'int' })
  month: number;

  @Column({ type: 'int' })
  year: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, name: 'base_salary' })
  baseSalary: number;

  @Column({
    type: 'numeric',
    precision: 4,
    scale: 2,
    default: 0.0,
    name: 'work_days',
  })
  workDays: number;

  @Column({
    type: 'numeric',
    precision: 5,
    scale: 2,
    default: 0.0,
    name: 'ot_normal_hours',
  })
  otNormalHours: number;

  @Column({
    type: 'numeric',
    precision: 5,
    scale: 2,
    default: 0.0,
    name: 'ot_weekend_hours',
  })
  otWeekendHours: number;

  @Column({
    type: 'numeric',
    precision: 5,
    scale: 2,
    default: 0.0,
    name: 'ot_holiday_hours',
  })
  otHolidayHours: number;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0.0,
    name: 'ot_pay_amount',
  })
  otPayAmount: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0.0 })
  allowance: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0.0 })
  deduction: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, name: 'net_salary' })
  netSalary: number;

  @Column({ type: 'varchar', length: 20, default: 'DRAFT' })
  status: string;

  @Column({ type: 'bigint', nullable: true, name: 'approval_request_id' })
  approvalRequestId: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Employee, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @ManyToOne(() => ApprovalRequest, { nullable: true })
  @JoinColumn({ name: 'approval_request_id' })
  approvalRequest: ApprovalRequest;
}
