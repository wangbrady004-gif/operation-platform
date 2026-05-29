import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type BotTaskStatus = 'pending' | 'running' | 'stop_requested' | 'done';

@Entity('bot_tasks')
export class BotTaskEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'merchant_id' })
  bankProfileId: string;

  @Column({ name: 'profile_key' })
  profileKey: string;

  @Column()
  module: string;

  @Column({ name: 'settings_key' })
  settingsKey: string;

  @Column({ name: 'login_type' })
  loginType: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: BotTaskStatus;

  @Column({ name: 'claimed_by', nullable: true, type: 'varchar' })
  claimedBy: string | null;

  @Column({ name: 'created_by_email' })
  createdByEmail: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
