import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Employee } from './employee.entity';
import { ApprovalRequest } from './approval-request.entity';

/** Bảng 18: salary_histories — Ref: schema.sql line 377-388 */
@Entity('salary_histories')
export class SalaryHistory {
  @PrimaryColumn({ type: 'bigint' })
  id: string;

  @Column({
    type: 'varchar',
    length: 50,
    unique: true,
    name: 'addendum_number',
  })
  addendumNumber: string;

  @Column({ type: 'bigint', name: 'employee_id' })
  employeeId: string;

  @Column({ type: 'date', name: 'effective_date' })
  effectiveDate: Date;

  @Column({ type: 'numeric', precision: 12, scale: 2, name: 'old_base_salary' })
  oldBaseSalary: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, name: 'new_base_salary' })
  newBaseSalary: number;

  @Column({ type: 'numeric', precision: 4, scale: 2, name: 'old_ratio' })
  oldRatio: number;

  @Column({ type: 'numeric', precision: 4, scale: 2, name: 'new_ratio' })
  newRatio: number;

  @Column({ type: 'bigint', nullable: true, name: 'approval_request_id' })
  approvalRequestId: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Employee, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @ManyToOne(() => ApprovalRequest, { nullable: true })
  @JoinColumn({ name: 'approval_request_id' })
  approvalRequest: ApprovalRequest;
}
