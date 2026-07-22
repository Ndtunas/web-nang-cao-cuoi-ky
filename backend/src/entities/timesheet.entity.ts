import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Employee } from './employee.entity.js';
import { ApprovalRequest } from './approval-request.entity.js';

/**
 * Bảng 12: timesheets — Bảng Timesheet tuần
 * Ref: database/03_schema.sql line 290-305
 */
@Entity('timesheets')
export class Timesheet {
  @PrimaryColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true, nullable: true, name: 'timesheet_code' })
  timesheetCode: string;

  @Column({ type: 'bigint', name: 'employee_id' })
  employeeId: string;

  @Column({ type: 'int', name: 'week_number' })
  weekNumber: number;

  @Column({ type: 'int' })
  year: number;

  @Column({ type: 'date', name: 'start_date' })
  startDate: Date;

  @Column({ type: 'date', name: 'end_date' })
  endDate: Date;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0.0, name: 'total_normal_hours' })
  totalNormalHours: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0.0, name: 'total_ot_hours' })
  totalOtHours: number;

  @Column({ type: 'varchar', length: 20, default: 'DRAFT' })
  status: string;

  @Column({ type: 'bigint', nullable: true, name: 'approval_request_id' })
  approvalRequestId: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Employee, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @ManyToOne(() => ApprovalRequest, { nullable: true })
  @JoinColumn({ name: 'approval_request_id' })
  approvalRequest: ApprovalRequest;
}
