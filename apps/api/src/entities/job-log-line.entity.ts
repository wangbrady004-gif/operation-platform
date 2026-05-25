import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { JobEntity } from './job.entity';

@Entity('job_log_lines')
@Index(['jobId', 'lineNo'], { unique: true })
export class JobLogLineEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'job_id', type: 'uuid' })
  jobId: string;

  @ManyToOne(() => JobEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'job_id' })
  job: JobEntity;

  /** Monotonic line index per job (0-based). */
  @Column({ name: 'line_no', type: 'int' })
  lineNo: number;

  @Column({ type: 'text' })
  text: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
