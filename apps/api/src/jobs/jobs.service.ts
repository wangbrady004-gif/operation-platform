import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { JobLogLineEntity } from '../entities/job-log-line.entity';
import { JobEntity } from '../entities/job.entity';
import { AuditService } from '../audit/audit.service';
import type {
  JobPayload,
  JobRecord,
  JobState,
  JobSummary,
} from './job.types';
import { JobLogStreamService } from './job-log-stream.service';
import type { CreateJobDto } from './dto/create-job.dto';
import { PaytmMerchantsService } from '../merchants/paytm-merchants.service';
import { inferPaytmThinScriptKind } from '../merchants/paytm-runner-core';

const MAX_STORED_LOG_LINES = 2000;
const DEFAULT_STUCK_MINUTES = 2;

/** Must exist in b_auto; implements CLI + optional anchor poll for ops. Thin TP_*.py bots use POST /jobs without `paytm`. */
export const PAYTM_WRAPPER_SCRIPT = 'tp_127_executabes/run_paytm_bot.py';
export const GOOGLE_WRAPPER_SCRIPT = 'tp_127_executabes/run_google_bot.py';

export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    @InjectRepository(JobEntity)
    private readonly jobRepo: Repository<JobEntity>,
    @InjectRepository(JobLogLineEntity)
    private readonly logRepo: Repository<JobLogLineEntity>,
    private readonly dataSource: DataSource,
    private readonly audit: AuditService,
    private readonly logStream: JobLogStreamService,
    private readonly paytmMerchants: PaytmMerchantsService,
  ) {}

  private assertSafeRelativePath(rel: string): void {
    const t = rel.trim();
    if (!t.endsWith('.py')) {
      throw new BadRequestException('scriptRelativePath must end with .py');
    }
    if (t.startsWith('/') || t.includes('..')) {
      throw new BadRequestException('scriptRelativePath must be a safe relative path');
    }
  }

  private assertThinExecutableRelativePath(rel: string): void {
    const t = rel.trim();
    this.assertSafeRelativePath(t);
    if (!t.startsWith('tp_127_executabes/')) {
      throw new BadRequestException(
        'thinScriptRelativePath must start with tp_127_executabes/',
      );
    }
  }

  private assertPaytmModeMatchesRunnable(
    mode: 'txn' | 'name',
    thinPath: string,
  ): void {
    const t = thinPath.trim();
    const k = inferPaytmThinScriptKind(t);
    if (k === 'unknown') {
      throw new BadRequestException(
        `Thin script "${t}" must look like TP_PAYTM_TXN_* (transaction anchors) or TP_PAYTM_NAME_* (customer + txn anchors), matching your vendored file from b_auto.`,
      );
    }
    if (k === 'txn' && mode !== 'txn') {
      throw new BadRequestException(
        `paytm.mode must be "txn" for thin script "${t}" (TXN runner filename pattern).`,
      );
    }
    if (k === 'name' && mode !== 'name') {
      throw new BadRequestException(
        `paytm.mode must be "name" for thin script "${t}" (NAME runner filename pattern).`,
      );
    }
  }

  async create(
    dto: CreateJobDto,
    actor?: { email: string | null; ip?: string | null },
  ): Promise<JobEntity> {
    this.assertSafeRelativePath(dto.scriptRelativePath);
    const trimmedPath = dto.scriptRelativePath.trim();

    let payload: JobPayload | null = null;

    if (dto.paytm) {
      if (trimmedPath !== PAYTM_WRAPPER_SCRIPT) {
        throw new BadRequestException(
          `When paytm is supplied, scriptRelativePath must be "${PAYTM_WRAPPER_SCRIPT}" (add that wrapper to b_auto if missing). For native thin executables such as tp_127_executabes/TP_PAYTM_*.py, omit paytm and send scriptRelativePath only.`,
        );
      }
      const defer = Boolean(dto.paytm.deferAnchors);
      if (!defer) {
        if (!dto.paytm.lastTransactionId?.trim()) {
          throw new BadRequestException(
            'paytm.lastTransactionId is required unless paytm.deferAnchors is true',
          );
        }
        if (
          dto.paytm.mode === 'name' &&
          !(dto.paytm.lastCustomerName && dto.paytm.lastCustomerName.trim())
        ) {
          throw new BadRequestException(
            'paytm.lastCustomerName is required when paytm.mode is "name" and anchors are not deferred',
          );
        }
      }

      let thinStored: string;
      const thinFromClient =
        dto.paytm.thinScriptRelativePath?.trim() ?? '';

      if (dto.paytm.merchantId) {
        await this.paytmMerchants.assertProfileMatchesMerchant(
          dto.paytm.merchantId,
          dto.paytm.profile,
        );
        const mEnt = await this.paytmMerchants.getOne(dto.paytm.merchantId);
        const regPath = mEnt.executableRelativePath?.trim() ?? '';
        if (!regPath) {
          throw new BadRequestException(
            'Merchant has no executable_relative_path — set the vendored TP_PAYTM_*.py path (same file you run in PyCharm / b_auto).',
          );
        }

        if (thinFromClient) {
          this.assertThinExecutableRelativePath(thinFromClient);
          if (regPath !== thinFromClient) {
            throw new BadRequestException(
              `thinScriptRelativePath must match the merchant runner path (${regPath})`,
            );
          }
          thinStored = thinFromClient;
        } else {
          this.assertThinExecutableRelativePath(regPath);
          thinStored = regPath;
        }
      } else {
        if (!thinFromClient) {
          throw new BadRequestException(
            'paytm.thinScriptRelativePath is required when paytm.merchantId is omitted',
          );
        }
        this.assertThinExecutableRelativePath(thinFromClient);
        thinStored = thinFromClient;
      }

      this.assertPaytmModeMatchesRunnable(dto.paytm.mode, thinStored);

      const basePaytm = {
        kind: 'paytm' as const,
        mode: dto.paytm.mode,
        profile: dto.paytm.profile.trim(),
        merchantId: dto.paytm.merchantId,
        thinScriptRelativePath: thinStored,
      };

      if (defer) {
        payload = {
          ...basePaytm,
          deferAnchors: true,
        };
      } else {
        payload = {
          ...basePaytm,
          lastTransactionId: dto.paytm.lastTransactionId!.trim(),
          lastCustomerName: dto.paytm.lastCustomerName?.trim(),
        };
      }
    } else if (dto.google) {
      if (trimmedPath !== GOOGLE_WRAPPER_SCRIPT) {
        throw new BadRequestException(
          `When google is supplied, scriptRelativePath must be "${GOOGLE_WRAPPER_SCRIPT}".`,
        );
      }
      await this.paytmMerchants.assertProfileMatchesMerchant(
        dto.google.merchantId,
        dto.google.profile,
      );
      payload = {
        kind: 'google' as const,
        profile: dto.google.profile.trim(),
        lastUtr: dto.google.lastUtr.trim(),
        merchantId: dto.google.merchantId,
      };
    }

    const initialState: JobState = 'starting';

    const job = this.jobRepo.create({
      scriptRelativePath: trimmedPath,
      payload,
      paytmAnchorInput: null,
      state: initialState,
      cancellationRequestedAt: null,
      startedAt: null,
      endedAt: null,
      exitCode: null,
      error: null,
    });
    await this.jobRepo.save(job);
    if (payload?.kind === 'paytm') {
      this.logger.log(
        `PayTM automation session ${job.id} (${initialState}→running when worker picks up): mode=${payload.mode} profile=${payload.profile} deferAnchors=${!!payload.deferAnchors} merchantId=${payload.merchantId ?? 'none'} thin=${payload.thinScriptRelativePath}`,
      );
    } else {
      this.logger.log(
        `Scheduled session ${job.id}: script=${job.scriptRelativePath}`,
      );
    }
    void this.audit.log({
      action: 'job.create',
      actorEmail: actor?.email ?? null,
      resourceType: 'job',
      resourceId: job.id,
      payload: {
        scriptRelativePath: job.scriptRelativePath,
        paytmKind: payload?.kind ?? null,
        profile: payload?.kind === 'paytm' ? payload.profile : null,
        mode: payload?.kind === 'paytm' ? payload.mode : null,
        merchantId: payload?.merchantId ?? null,
        deferAnchors: payload?.kind === 'paytm' ? !!payload.deferAnchors : null,
        thinScriptRelativePath:
          payload?.kind === 'paytm' ? payload.thinScriptRelativePath : null,
        initialState,
      },
      clientIp: actor?.ip ?? null,
    });
    return job;
  }

  async listSummaries(): Promise<JobSummary[]> {
    const jobs = await this.jobRepo.find({
      order: { createdAt: 'DESC' },
      take: 500,
    });
    if (jobs.length === 0) return [];
    const ids = jobs.map((j) => j.id);
    const raw = await this.logRepo
      .createQueryBuilder('l')
      .select('l.jobId', 'jobId')
      .addSelect('COUNT(*)', 'cnt')
      .where('l.jobId IN (:...ids)', { ids })
      .groupBy('l.jobId')
      .getRawMany<{ jobId: string; cnt: string }>();
    const counts = new Map(
      raw.map((r) => [r.jobId, parseInt(r.cnt, 10)] as const),
    );
    return jobs.map((j) => ({
      id: j.id,
      scriptRelativePath: j.scriptRelativePath,
      payload: j.payload ?? null,
      state: j.state,
      cancellationRequestedAt: j.cancellationRequestedAt
        ? j.cancellationRequestedAt.toISOString()
        : null,
      createdAt: j.createdAt.toISOString(),
      startedAt: j.startedAt ? j.startedAt.toISOString() : null,
      endedAt: j.endedAt ? j.endedAt.toISOString() : null,
      exitCode: j.exitCode,
      error: j.error,
      logLineCount: counts.get(j.id) ?? 0,
    }));
  }

  async getById(id: string, logTail = 200): Promise<JobRecord> {
    const job = await this.jobRepo.findOne({ where: { id } });
    if (!job) throw new NotFoundException(`Job ${id} not found`);
    const n = logTail <= 0 ? 0 : Math.min(logTail, 10000);
    let logs: string[] = [];
    if (n > 0) {
      const rows = await this.logRepo.find({
        where: { jobId: id },
        order: { lineNo: 'DESC' },
        take: n,
      });
      logs = rows.reverse().map((r) => r.text);
    }
    return {
      id: job.id,
      scriptRelativePath: job.scriptRelativePath,
      payload: job.payload ?? null,
      state: job.state,
      cancellationRequestedAt: job.cancellationRequestedAt
        ? job.cancellationRequestedAt.toISOString()
        : null,
      createdAt: job.createdAt.toISOString(),
      startedAt: job.startedAt ? job.startedAt.toISOString() : null,
      endedAt: job.endedAt ? job.endedAt.toISOString() : null,
      exitCode: job.exitCode,
      error: job.error,
      logs,
      paytmAnchorInput: job.paytmAnchorInput ?? null,
    };
  }

  /**
   * Worker polls this while `--defer-anchors` PayTM job is waiting for operator input.
   */
  async getAnchorForWorker(jobId: string): Promise<{
    ready: boolean;
    lastTransactionId?: string;
    lastCustomerName?: string;
  }> {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job?.payload || job.payload.kind !== 'paytm') {
      return { ready: false };
    }
    const input = job.paytmAnchorInput;
    if (!input?.lastTransactionId?.trim()) {
      return { ready: false };
    }
    if (
      job.payload.mode === 'name' &&
      !(input.lastCustomerName && input.lastCustomerName.trim())
    ) {
      return { ready: false };
    }
    return {
      ready: true,
      lastTransactionId: input.lastTransactionId.trim(),
      lastCustomerName: input.lastCustomerName?.trim(),
    };
  }

  async submitPaytmAnchors(
    id: string,
    dto: { lastTransactionId: string; lastCustomerName?: string },
    actor?: { email: string | null; ip?: string | null },
  ): Promise<{ ok: true }> {
    const job = await this.jobRepo.findOne({ where: { id } });
    if (!job) throw new NotFoundException(`Job ${id} not found`);
    if (job.state !== 'running') {
      throw new ConflictException('Anchors can only be submitted while the job is running');
    }
    const p = job.payload;
    if (!p || p.kind !== 'paytm' || !p.deferAnchors) {
      throw new BadRequestException(
        'This job does not use deferred PayTM anchors',
      );
    }
    const tid = dto.lastTransactionId.trim();
    if (!tid) {
      throw new BadRequestException('lastTransactionId is required');
    }
    let nameTrimmed: string | undefined;
    if (p.mode === 'name') {
      const n = dto.lastCustomerName?.trim();
      if (!n) {
        throw new BadRequestException(
          'lastCustomerName is required for name mode',
        );
      }
      nameTrimmed = n;
    }
    job.paytmAnchorInput = { lastTransactionId: tid, lastCustomerName: nameTrimmed };
    await this.jobRepo.save(job);
    void this.audit.log({
      action: 'job.paytm_anchors',
      actorEmail: actor?.email ?? null,
      resourceType: 'job',
      resourceId: job.id,
      payload: {
        mode: p.mode,
        profile: p.profile,
        hasCustomerName: p.mode === 'name',
      },
      clientIp: actor?.ip ?? null,
    });
    return { ok: true };
  }

  /**
   * Atomically claim the next session waiting for this worker (`starting`, or legacy `queued`).
   */
  async claimNext(): Promise<JobEntity | null> {
    const rows: Record<string, unknown>[] = await this.dataSource.query(
      `
      WITH cte AS (
        SELECT id FROM jobs WHERE state IN ('queued', 'starting') ORDER BY created_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      UPDATE jobs SET state = $1, started_at = NOW()
      WHERE id IN (SELECT id FROM cte)
      RETURNING
        id,
        script_relative_path as "scriptRelativePath",
        payload,
        state,
        created_at as "createdAt",
        started_at as "startedAt"
    `,
      ['running'],
    );
    if (!rows?.length) return null;
    const row = rows[0];
    const id = row?.id;
    if (typeof id !== 'string' || id.length === 0) return null;
    const claimedPath = String(row.scriptRelativePath ?? '');
    this.logger.log(`Worker claimed job ${id}: ${claimedPath}`);
    // Build a minimal JobEntity-like object; avoids any weirdness when id is null.
    return {
      id,
      scriptRelativePath: String(row.scriptRelativePath ?? ''),
      payload: (row.payload as JobPayload | null) ?? null,
      state: String(row.state ?? 'running') as JobState,
      createdAt: new Date(String(row.createdAt)),
      startedAt: row.startedAt ? new Date(String(row.startedAt)) : null,
      endedAt: null,
      exitCode: null,
      error: null,
    } as JobEntity;
  }

  async appendLogs(id: string, lines: string[]): Promise<void> {
    if (lines.length === 0) return;
    const job = await this.jobRepo.findOne({ where: { id } });
    if (!job) throw new NotFoundException(`Job ${id} not found`);
    if (job.state !== 'running') {
      throw new ConflictException('Job is not running; cannot append logs');
    }
    const maxRow = await this.logRepo
      .createQueryBuilder('l')
      .select('MAX(l.lineNo)', 'max')
      .where('l.jobId = :id', { id })
      .getRawOne<{ max: string | null }>();
    let lineNo =
      maxRow?.max != null ? parseInt(String(maxRow.max), 10) + 1 : 0;
    const batch = lines.map((text) =>
      this.logRepo.create({ jobId: id, lineNo: lineNo++, text }),
    );
    await this.logRepo.save(batch);

    const cnt = await this.logRepo.count({ where: { jobId: id } });
    if (cnt > MAX_STORED_LOG_LINES) {
      const del = cnt - MAX_STORED_LOG_LINES;
      await this.dataSource.query(
        `
        DELETE FROM job_log_lines WHERE id IN (
          SELECT id FROM job_log_lines WHERE job_id = $1 ORDER BY line_no ASC LIMIT $2
        )
      `,
        [id, del],
      );
    }

    this.logStream.emitLines(id, lines);
  }

  async finish(
    id: string,
    exitCode: number,
    error?: string,
    opts?: { cancelled?: boolean },
  ): Promise<JobEntity> {
    const job = await this.jobRepo.findOne({ where: { id } });
    if (!job) throw new NotFoundException(`Job ${id} not found`);
    // Idempotency: if another worker already finished the job, don't 409-loop.
    if (job.state !== 'running') {
      if (job.endedAt) return job;
      throw new ConflictException(
        `Job is ${job.state}; cannot finish (expected running)`,
      );
    }
    job.endedAt = new Date();
    job.exitCode = exitCode;
    job.error = error ?? null;
    job.cancellationRequestedAt = null;
    if (opts?.cancelled) {
      job.state = 'cancelled';
    } else if (exitCode === 0) {
      job.state = 'succeeded';
    } else {
      job.state = 'failed';
    }
    await this.jobRepo.save(job);
    if (opts?.cancelled) {
      this.logger.warn(`Job ${id} cancelled by operator exitCode=${exitCode}`);
    } else if (exitCode !== 0 || error) {
      this.logger.warn(
        `Job ${id} finished state=${job.state} exitCode=${exitCode}${error ? ` error=${error}` : ''}`,
      );
    } else {
      this.logger.log(`Job ${id} succeeded`);
    }
    void this.audit.log({
      action: 'job.finish',
      resourceType: 'job',
      resourceId: id,
      payload: {
        exitCode,
        error: error ?? null,
        cancelled: !!opts?.cancelled,
      },
    });
    this.logStream.emitDone(id, job.state, job.exitCode);
    return job;
  }

  /**
   * Recover sessions stuck `running` with no worker (crash / disconnect).
   * Returns rows to `starting` so the worker can attach again.
   */
  async adminRequeueRunningJob(
    id: string,
    actor?: { email: string | null; ip?: string | null },
  ): Promise<{ ok: true; id: string; state: JobState }> {
    const job = await this.jobRepo.findOne({ where: { id } });
    if (!job) throw new NotFoundException(`Job ${id} not found`);
    if (job.state !== 'running') {
      throw new BadRequestException(
        `Job is ${job.state}; only jobs in state "running" can be reset for worker retry`,
      );
    }
    if (job.endedAt) {
      throw new ConflictException(
        `Job ${id} has ended_at set; refusal to overwrite`,
      );
    }
    job.state = 'starting';
    job.startedAt = null;
    job.cancellationRequestedAt = null;
    await this.jobRepo.save(job);
    void this.audit.log({
      action: 'job.admin_requeue_running',
      actorEmail: actor?.email ?? null,
      resourceType: 'job',
      resourceId: id,
      payload: {},
    });
    return { ok: true, id: job.id, state: job.state };
  }

  /** Lightweight counts by `state` for worker / dashboards (internal token only). */
  async internalJobCounts(): Promise<Record<string, number>> {
    const rows: { state: string; count: number }[] =
      await this.dataSource.query(
        `SELECT state, COUNT(*)::int AS count FROM jobs GROUP BY state`,
      );
    return Object.fromEntries(
      rows.map((r) => [r.state, Number.parseInt(String(r.count), 10)]),
    );
  }

  async cancel(
    id: string,
    actor?: { email: string | null; ip?: string | null },
  ): Promise<JobEntity> {
    const job = await this.jobRepo.findOne({ where: { id } });
    if (!job) throw new NotFoundException(`Job ${id} not found`);

    if (
      job.state === 'succeeded' ||
      job.state === 'failed' ||
      job.state === 'cancelled'
    ) {
      throw new ConflictException(`Job is already ${job.state}`);
    }

    if (job.state === 'queued' || job.state === 'starting') {
      job.state = 'cancelled';
      job.endedAt = new Date();
      job.cancellationRequestedAt = null;
      await this.jobRepo.save(job);
      void this.audit.log({
        action: 'job.cancel',
        actorEmail: actor?.email ?? null,
        resourceType: 'job',
        resourceId: id,
        payload: { phase: 'before_worker' },
        clientIp: actor?.ip ?? null,
      });
      this.logStream.emitDone(id, 'cancelled', null);
      return job;
    }

    if (job.state === 'running') {
      const logCount = await this.logRepo.count({ where: { jobId: id } });
      const now = Date.now();
      const startedAgeMs =
        job.startedAt != null ? now - job.startedAt.getTime() : Number.POSITIVE_INFINITY;
      /**
       * Claim sets «running» before the worker persists bootstrap logs. Allow that window,
       * then treat zero-log «running» as orphan (crashed worker / duplicate terminals).
       */
      const orphanStaleNoLogs =
        logCount === 0 && startedAgeMs >= 120_000;

      if (orphanStaleNoLogs) {
        job.state = 'cancelled';
        job.endedAt = new Date();
        job.cancellationRequestedAt = null;
        job.exitCode = null;
        job.error =
          'Stopped — no log lines reached ops while this session stayed «running» (stale row or worker lost). Keep a single worker process.';
        await this.jobRepo.save(job);
        void this.audit.log({
          action: 'job.cancel',
          actorEmail: actor?.email ?? null,
          resourceType: 'job',
          resourceId: id,
          payload: { phase: 'running_orphan_no_logs' },
          clientIp: actor?.ip ?? null,
        });
        this.logStream.emitDone(id, 'cancelled', null);
        return job;
      }

      if (!job.cancellationRequestedAt) {
        job.cancellationRequestedAt = new Date();
        await this.jobRepo.save(job);
        void this.audit.log({
          action: 'job.cancel',
          actorEmail: actor?.email ?? null,
          resourceType: 'job',
          resourceId: id,
          payload: { phase: 'running_stop_requested' },
          clientIp: actor?.ip ?? null,
        });
      }
      return job;
    }

    throw new ConflictException(`Job is ${job.state}; cannot cancel`);
  }

  async requeueStuckRunning(minutes = DEFAULT_STUCK_MINUTES): Promise<{
    requeued: number;
  }> {
    const mins = Number.isFinite(minutes) ? Math.max(1, Math.floor(minutes)) : 2;
    const rows: { id: string }[] = await this.dataSource.query(
      `
      UPDATE jobs
      SET state = 'starting',
        started_at = NULL,
        cancellation_requested_at = NULL
      WHERE state = 'running'
        AND ended_at IS NULL
        AND started_at IS NOT NULL
        AND started_at < NOW() - ($1::text || ' minutes')::interval
      RETURNING id
    `,
      [String(mins)],
    );
    if (rows.length) {
      void this.audit.log({
        action: 'job.requeue_stuck',
        resourceType: 'job',
        payload: { minutes: mins, ids: rows.map((r) => r.id) },
      });
    }
    return { requeued: rows.length };
  }

  /** Worker polls this while subprocess runs (merchant automation stop button). */
  async getCancellationRequestedForWorker(
    jobId: string,
  ): Promise<{ requested: boolean }> {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job || job.state !== 'running') {
      return { requested: false };
    }
    return { requested: job.cancellationRequestedAt != null };
  }
}
