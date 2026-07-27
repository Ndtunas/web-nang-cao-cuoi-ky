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
import { Department } from './department.entity';
import { Position } from './position.entity';

/**
 * Bảng 6: employees — Hồ sơ nhân viên (Thực thể Trung tâm)
 * Ref: database/03_schema.sql line 206-225
 */
@Entity('employees')
export class Employee {
  @PrimaryColumn({ type: 'bigint' })
  id: string;

  @Column({
    type: 'varchar',
    length: 30,
    unique: true,
    name: 'emp_code',
    nullable: true,
  })
  empCode: string;

  @Column({ type: 'varchar', length: 100, name: 'full_name' })
  fullName: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  gender: string;

  @Column({ type: 'date', nullable: true })
  dob: Date;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'tax_code' })
  taxCode: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'bank_name' })
  bankName: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'bank_account' })
  bankAccount: string;

  @Column({ type: 'date', name: 'join_date', default: () => 'CURRENT_DATE' })
  joinDate: Date;

  @Column({ type: 'date', nullable: true, name: 'end_date' })
  endDate: Date;

  @Column({ type: 'varchar', length: 20, default: 'ONBOARDING' })
  status: string;

  @Column({ type: 'bigint', nullable: true, name: 'department_id' })
  departmentId: string;

  @Column({ type: 'bigint', nullable: true, name: 'position_id' })
  positionId: string;

  @Column({ type: 'bigint', nullable: true, unique: true, name: 'user_id' })
  userId: string;

  @Column({ type: 'int', default: 12, name: 'annual_leave_balance' })
  annualLeaveBalance: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @ManyToOne(() => Position, { nullable: true })
  @JoinColumn({ name: 'position_id' })
  position: Position;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
