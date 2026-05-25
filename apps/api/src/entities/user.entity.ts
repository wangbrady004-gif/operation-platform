import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum UserRole {
  viewer = 'viewer',
  operator = 'operator',
  admin = 'admin',
}

/** Block sign-in / API while inactive (admin can toggle on Team page). */
export enum UserStatus {
  active = 'active',
  inactive = 'inactive',
}

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ type: 'varchar', length: 20 })
  role: UserRole;

  @Column({ type: 'varchar', length: 16, default: UserStatus.active })
  status: UserStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
