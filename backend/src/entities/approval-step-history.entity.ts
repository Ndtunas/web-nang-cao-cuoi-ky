import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ApprovalRequest } from './approval-request.entity.js';
import { Employee } from './employee.entity.js';

/**
 * Bảng 11: approval_step_histories — Lịch sử các cấp duyệt
 * Ref: database/03_schema.sql line 278-287
 */
@Entity('approval_step_histories')
export class ApprovalStepHistory {
  @PrimaryColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint', name: 'request_id' })
  requestId: string;

  @Column({ type: 'int', name: 'step_level' })
  stepLevel: number;

  @Column({ type: 'varchar', length: 20, name: 'approver_role' })
  approverRole: string;

  @Column({ type: 'bigint', nullable: true, name: 'approver_id' })
  approverId: string | null;

  @Column({ type: 'varchar', length: 20 })
  action: string;

  @Column({ type: 'text', nullable: true })
  comment: string;

  @Column({
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
    name: 'action_at',
  })
  actionAt: Date;

  // Relations
  @ManyToOne(() => ApprovalRequest, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'request_id' })
  request: ApprovalRequest;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'approver_id' })
  approver: Employee;
}
