import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('ops_launchers')
export class OpsLauncherEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'launcher_id', unique: true })
  launcherId: string;

  @Column({ name: 'bot_root', type: 'varchar', length: 512, nullable: true })
  botRoot: string | null;

  @Column({ name: 'needs_update', default: false })
  needsUpdate: boolean;

  @Column({ name: 'created_by_email' })
  createdByEmail: string;

  @Column({ name: 'last_seen_at', type: 'timestamptz', nullable: true })
  lastSeenAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
