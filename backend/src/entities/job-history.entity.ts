import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Employee } from './employee.entity.js';
import { Department } from './department.entity.js';
import { Position } from './position.entity.js';
import { ApprovalRequest } from './approval-request.entity.js';

/** Bảng 17: job_histories — Ref: schema.sql line 363-374 */
@Entity('job_histories')
export class JobHistory {
  @PrimaryColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true, name: 'decision_number' })
  decisionNumber: string;

  @Column({ type: 'bigint', name: 'employee_id' })
  employeeId: string;

  @Column({ type: 'date', name: 'effective_date' })
  effectiveDate: Date;

  @Column({ type: 'bigint', nullable: true, name: 'old_department_id' })
  oldDepartmentId: string;

  @Column({ type: 'bigint', nullable: true, name: 'new_department_id' })
  newDepartmentId: string;

  @Column({ type: 'bigint', nullable: true, name: 'old_position_id' })
  oldPositionId: string;

  @Column({ type: 'bigint', nullable: true, name: 'new_position_id' })
  newPositionId: string;

  @Column({ type: 'bigint', nullable: true, name: 'approval_request_id' })
  approvalRequestId: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Employee, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'old_department_id' })
  oldDepartment: Department;

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'new_department_id' })
  newDepartment: Department;

  @ManyToOne(() => Position, { nullable: true })
  @JoinColumn({ name: 'old_position_id' })
  oldPosition: Position;

  @ManyToOne(() => Position, { nullable: true })
  @JoinColumn({ name: 'new_position_id' })
  newPosition: Position;

  @ManyToOne(() => ApprovalRequest, { nullable: true })
  @JoinColumn({ name: 'approval_request_id' })
  approvalRequest: ApprovalRequest;
}
