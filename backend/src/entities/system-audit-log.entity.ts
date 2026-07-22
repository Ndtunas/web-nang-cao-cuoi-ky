import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity.js';

/** Bảng 2: system_audit_logs — Ref: schema.sql line 157-169 */
@Entity('system_audit_logs')
export class SystemAuditLog {
  @PrimaryColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  timestamp: Date;

  @Column({ type: 'bigint', nullable: true, name: 'actor_id' })
  actorId: string;

  @Column({ type: 'varchar', length: 20, name: 'actor_role' })
  actorRole: string;

  @Column({ type: 'varchar', length: 20, name: 'action_type' })
  actionType: string;

  @Column({ type: 'varchar', length: 50, name: 'entity_name' })
  entityName: string;

  @Column({ type: 'varchar', length: 100, name: 'entity_id' })
  entityId: string;

  @Column({ type: 'jsonb', nullable: true, name: 'old_data' })
  oldData: any;

  @Column({ type: 'jsonb', nullable: true, name: 'new_data' })
  newData: any;

  @Column({ type: 'varchar', length: 45, nullable: true, name: 'ip_address' })
  ipAddress: string;

  @Column({ type: 'text', nullable: true, name: 'user_agent' })
  userAgent: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'actor_id' })
  actor: User;
}
