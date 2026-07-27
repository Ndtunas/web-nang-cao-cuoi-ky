import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

/** Bảng 3: work_rate_configs — Ref: schema.sql line 172-182 */
@Entity('work_rate_configs')
export class WorkRateConfig {
  @PrimaryColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true, name: 'config_key' })
  configKey: string;

  @Column({ type: 'varchar', length: 100, name: 'config_name' })
  configName: string;

  @Column({ type: 'numeric', precision: 5, scale: 2, name: 'value_multiplier' })
  valueMultiplier: number;

  @Column({
    type: 'date',
    name: 'effective_date',
    default: () => 'CURRENT_DATE',
  })
  effectiveDate: Date;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status: string;

  @Column({ type: 'bigint', nullable: true, name: 'updated_by_id' })
  updatedById: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updated_by_id' })
  updatedBy: User;
}
