import { Global, Injectable, OnModuleDestroy } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';

// ── Shared event shapes ────────────────────────────────────────────────────────

export type SseEvent =
  | {
      type: 'task_update';
      id: string;
      profileKey: string;
      module: string;
      status: string;
      createdAt: string;
    }
  | {
      type: 'launcher_heartbeat';
      launcherId: string;
      lastSeenAt: string;
    }
  | { type: 'ping' };

// ── Service ────────────────────────────────────────────────────────────────────

@Injectable()
export class EventsService implements OnModuleDestroy {
  private readonly subject = new Subject<SseEvent>();

  /** Observable that all SSE controllers subscribe to. */
  readonly events$: Observable<SseEvent> = this.subject.asObservable();

  emit(event: SseEvent): void {
    this.subject.next(event);
  }

  onModuleDestroy(): void {
    this.subject.complete();
  }
}
