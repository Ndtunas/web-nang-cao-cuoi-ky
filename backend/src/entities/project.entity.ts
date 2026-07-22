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

/**
 * Bảng 7: projects — Dự án
 * Ref: database/03_schema.sql line 230-240
 */
@Entity('projects')
export class Project {
  @PrimaryColumn({ type: 'bigint' })
  id: string;

  @Column({
    type: 'varchar',
    length: 30,
    unique: true,
    nullable: true,
    name: 'project_code',
  })
  projectCode: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'date', name: 'start_date' })
  startDate: Date;

  @Column({ type: 'date', nullable: true, name: 'end_date' })
  endDate: Date;

  @Column({ type: 'bigint', nullable: true, name: 'pm_id' })
  pmId: string;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'pm_id' })
  pm: Employee;
}
