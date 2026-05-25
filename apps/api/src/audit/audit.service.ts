import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditEventEntity } from '../entities/audit-event.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditEventEntity)
    private readonly repo: Repository<AuditEventEntity>,
  ) {}

  async log(evt: {
    action: string;
    actorEmail?: string | null;
    resourceType?: string | null;
    resourceId?: string | null;
    payload?: Record<string, unknown> | null;
    clientIp?: string | null;
  }): Promise<void> {
    await this.repo.insert({
      action: evt.action,
      actorEmail: evt.actorEmail ?? null,
      resourceType: evt.resourceType ?? null,
      resourceId: evt.resourceId ?? null,
      payload: (evt.payload ?? null) as object | null,
      clientIp: evt.clientIp ?? null,
    });
  }

  async recent(take = 100): Promise<AuditEventEntity[]> {
    return this.repo.find({
      order: { createdAt: 'DESC' },
      take,
    });
  }
}
