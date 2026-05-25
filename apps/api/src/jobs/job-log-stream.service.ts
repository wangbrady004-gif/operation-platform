import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Subject } from 'rxjs';
import { MessageEvent } from '@nestjs/common';

/** Broadcasts live log lines to SSE subscribers per job id. */
@Injectable()
export class JobLogStreamService implements OnModuleDestroy {
  private readonly subs = new Map<string, Subject<MessageEvent>>();

  private channel(jobId: string): Subject<MessageEvent> {
    let s = this.subs.get(jobId);
    if (!s) {
      s = new Subject<MessageEvent>();
      this.subs.set(jobId, s);
    }
    return s;
  }

  getJobStream(jobId: string): Subject<MessageEvent> {
    return this.channel(jobId);
  }

  emitLines(jobId: string, lines: string[]): void {
    if (lines.length === 0) return;
    const payload = JSON.stringify({
      type: 'log',
      lines,
      ts: new Date().toISOString(),
    });
    this.channel(jobId).next({ data: payload });
  }

  emitDone(jobId: string, state: string, exitCode: number | null): void {
    const payload = JSON.stringify({
      type: 'done',
      state,
      exitCode,
      ts: new Date().toISOString(),
    });
    this.channel(jobId).next({ data: payload });
  }

  onModuleDestroy() {
    for (const s of this.subs.values()) {
      s.complete();
    }
    this.subs.clear();
  }
}
