import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('audit_events')
@Index(['createdAt'])
export class AuditEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'actor_email', type: 'text', nullable: true })
  actorEmail: string | null;

  @Column({ type: 'text' })
  action: string;

  @Column({ name: 'resource_type', type: 'text', nullable: true })
  resourceType: string | null;

  @Column({ name: 'resource_id', type: 'text', nullable: true })
  resourceId: string | null;

  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, unknown> | null;

  @Column({ name: 'client_ip', type: 'text', nullable: true })
  clientIp: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
