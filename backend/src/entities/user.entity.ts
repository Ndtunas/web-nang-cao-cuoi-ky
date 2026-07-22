import {
  Entity,
  PrimaryColumn,
  Column,
  OneToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Bảng 1: users — Tài khoản người dùng
 * Ref: database/03_schema.sql line 146-154
 */
@Entity('users')
export class User {
  @PrimaryColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  username: string;

  @Column({ type: 'varchar', length: 255, name: 'password_hash' })
  passwordHash: string;

  @Column({ type: 'varchar', length: 20 })
  role: string;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @Column({
    type: 'varchar',
    length: 255,
    name: 'refresh_token',
    nullable: true,
  })
  refreshToken: string | null;

  // Relations (lazy — sẽ define khi cần)
  // @OneToOne(() => Employee, employee => employee.user)
  // employee: Employee;
}
