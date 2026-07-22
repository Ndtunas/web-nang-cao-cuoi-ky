import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * Bảng 4: positions — Chức vụ & Hệ số lương
 * Ref: database/03_schema.sql line 185-192
 */
@Entity('positions')
export class Position {
  @PrimaryColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 100 })
  title: string;

  @Column({ type: 'numeric', precision: 4, scale: 2, default: 1.0, name: 'base_salary_ratio' })
  baseSalaryRatio: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
