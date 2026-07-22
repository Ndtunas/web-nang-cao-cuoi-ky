import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Employee } from './employee.entity.js';
import { ApprovalRequest } from './approval-request.entity.js';

/** Bảng 20: leave_requests — Ref: schema.sql line 404-415 */
@Entity('leave_requests')
export class LeaveRequest {
  @PrimaryColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint', name: 'employee_id' })
  employeeId: string;

  @Column({ type: 'varchar', length: 30, name: 'leave_type' })
  leaveType: string;

  @Column({ type: 'date', name: 'start_date' })
  startDate: Date;

  @Column({ type: 'date', name: 'end_date' })
  endDate: Date;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @Column({ type: 'varchar', length: 20, default: 'PENDING' })
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
