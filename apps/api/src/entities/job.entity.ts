import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { JobPayload, JobState } from '../jobs/job.types';
import { JobLogLineEntity } from './job-log-line.entity';

@Entity('jobs')
@Index(['state', 'createdAt'])
export class JobEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'script_relative_path' })
  scriptRelativePath: string;

  /** Optional structured args for the worker (e.g. PayTM runner). */
  @Column({ name: 'payload', type: 'jsonb', nullable: true })
  payload: JobPayload | null;

  /**
   * When payload.kind === paytm && deferAnchors, operator-submitted anchors after browser login.
   * Shape: { lastTransactionId: string; lastCustomerName?: string }
   */
  @Column({ name: 'paytm_anchor_input', type: 'jsonb', nullable: true })
  paytmAnchorInput: {
    lastTransactionId: string;
    lastCustomerName?: string;
  } | null;

  @Column({ type: 'varchar', length: 20 })
  state: JobState;

  @Column({
    name: 'cancellation_requested_at',
    type: 'timestamptz',
    nullable: true,
  })
  cancellationRequestedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  endedAt: Date | null;

  @Column({ name: 'exit_code', type: 'int', nullable: true })
  exitCode: number | null;

  @Column({ type: 'text', nullable: true })
  error: string | null;

  @OneToMany(() => JobLogLineEntity, (l) => l.job)
  logLines?: JobLogLineEntity[];
}
