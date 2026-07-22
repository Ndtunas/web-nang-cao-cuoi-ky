import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * Bảng 9: approval_configs — Cấu hình ma trận phê duyệt
 * Ref: database/03_schema.sql line 254-261
 */
@Entity('approval_configs')
export class ApprovalConfig {
  @PrimaryColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true, name: 'transaction_type' })
  transactionType: string;

  @Column({ type: 'int', default: 1, name: 'required_levels' })
  requiredLevels: number;

  @Column({ type: 'jsonb', name: 'approver_roles_sequence' })
  approverRolesSequence: any;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
