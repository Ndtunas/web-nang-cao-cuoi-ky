import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Project } from './project.entity.js';

/**
 * Bảng 8: project_tasks — Công việc thuộc dự án
 * Ref: database/03_schema.sql line 243-251
 */
@Entity('project_tasks')
export class ProjectTask {
  @PrimaryColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint', name: 'project_id' })
  projectId: string;

  @Column({ type: 'varchar', length: 150, name: 'task_name' })
  taskName: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'numeric', precision: 6, scale: 2, default: 0.0, name: 'estimated_hours' })
  estimatedHours: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;
}
