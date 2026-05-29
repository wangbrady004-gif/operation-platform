import { Controller, MessageEvent, Sse, UseGuards } from '@nestjs/common';
import { merge, interval, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { EventsService } from './events.service';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../entities/user.entity';

@Controller('events')
@UseGuards(RolesGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  /**
   * SSE stream — operators subscribe here to receive real-time updates.
   * Emits:
   *   • task_update  — on task create / claim / stop-request / done
   *   • launcher_heartbeat — on launcher EXE poll (keeps lastSeenAt fresh in UI)
   *   • ping         — every 20 s (keepalive, prevents proxy timeouts)
   */
  @Sse()
  @Roles(UserRole.operator, UserRole.admin)
  stream(): Observable<MessageEvent> {
    const events$ = this.eventsService.events$.pipe(
      map((event): MessageEvent => ({ data: event })),
    );

    const ping$ = interval(20_000).pipe(
      map((): MessageEvent => ({ data: { type: 'ping' } })),
    );

    return merge(events$, ping$);
  }
}
