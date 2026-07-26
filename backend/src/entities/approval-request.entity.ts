import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Employee } from './employee.entity.js';

/**
 * Bảng 10: approval_requests — Phiếu yêu cầu duyệt
 * Ref: database/03_schema.sql line 264-275
 */
@Entity('approval_requests')
export class ApprovalRequest {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({
    type: 'varchar',
    length: 50,
    unique: true,
    nullable: true,
    name: 'request_code',
  })
  requestCode: string;

  @Column({ type: 'varchar', length: 50, name: 'transaction_type' })
  transactionType: string;

  @Column({ type: 'varchar', length: 100, name: 'reference_entity_id' })
  referenceEntityId: string;

  @Column({ type: 'bigint', name: 'requester_id' })
  requesterId: string;

  @Column({ type: 'int', default: 1, name: 'current_level' })
  currentLevel: number;

  @Column({ type: 'int', default: 1, name: 'total_levels' })
  totalLevels: number;

  @Column({ type: 'varchar', length: 20, default: 'PENDING' })
  status: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Employee, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'requester_id' })
  requester: Employee;
}
