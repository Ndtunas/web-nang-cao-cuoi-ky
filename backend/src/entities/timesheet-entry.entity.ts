import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Timesheet } from './timesheet.entity';
import { Project } from './project.entity';
import { ProjectTask } from './project-task.entity';

/**
 * Bảng 13: timesheet_entries — Chi tiết dòng khai giờ công từng ngày
 * Ref: database/03_schema.sql line 308-320
 */
@Entity('timesheet_entries')
export class TimesheetEntry {
  @PrimaryColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint', name: 'timesheet_id' })
  timesheetId: string;

  @Column({ type: 'bigint', nullable: true, name: 'project_id' })
  projectId: string;

  @Column({ type: 'bigint', nullable: true, name: 'task_id' })
  taskId: string;

  @Column({ type: 'date', name: 'entry_date' })
  entryDate: Date;

  @Column({ type: 'numeric', precision: 4, scale: 2, name: 'hours_spent' })
  hoursSpent: number;

  @Column({ type: 'varchar', length: 20, name: 'work_type' })
  workType: string;

  @Column({
    type: 'numeric',
    precision: 4,
    scale: 2,
    default: 1.0,
    name: 'applied_rate',
  })
  appliedRate: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Timesheet, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'timesheet_id' })
  timesheet: Timesheet;

  @ManyToOne(() => Project, { nullable: true })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @ManyToOne(() => ProjectTask, { nullable: true })
  @JoinColumn({ name: 'task_id' })
  task: ProjectTask;
}
