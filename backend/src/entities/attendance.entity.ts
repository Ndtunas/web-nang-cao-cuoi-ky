import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Employee } from './employee.entity.js';

/** Bảng 19: attendances — Ref: schema.sql line 391-401 */
@Entity('attendances')
export class Attendance {
  @PrimaryColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint', name: 'employee_id' })
  employeeId: string;

  @Column({ type: 'date', name: 'work_date' })
  workDate: Date;

  @Column({ type: 'time', nullable: true, name: 'check_in' })
  checkIn: string;

  @Column({ type: 'time', nullable: true, name: 'check_out' })
  checkOut: string;

  @Column({
    type: 'numeric',
    precision: 4,
    scale: 2,
    default: 0.0,
    name: 'work_hours',
  })
  workHours: number;

  @Column({ type: 'varchar', length: 20, default: 'PRESENT' })
  status: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Employee, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;
}
