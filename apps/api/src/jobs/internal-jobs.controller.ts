import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { AppendLogsDto } from './dto/append-logs.dto';
import { FinishJobDto } from './dto/finish-job.dto';
import { InternalTokenGuard } from './internal-token.guard';
import { JobsService } from './jobs.service';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { JobEntity } from '../entities/job.entity';

@Public()
@Controller('internal/jobs')
@UseGuards(InternalTokenGuard)
export class InternalJobsController {
  constructor(
    private readonly jobs: JobsService,
    @InjectRepository(JobEntity)
    private readonly jobRepo: Repository<JobEntity>,
  ) {}

  /** Non-mutating peek (useful for debugging; does not claim). */
  @Get('peek')
  async peek() {
    const job = await this.jobRepo.findOne({
      where: { state: In(['queued', 'starting']) },
      order: { createdAt: 'ASC' },
    });
    return job
      ? {
          job: {
            id: job.id,
            scriptRelativePath: job.scriptRelativePath,
            payload: job.payload ?? null,
            state: job.state,
            createdAt: job.createdAt,
          },
        }
      : { job: null };
  }

  @Get('next')
  async next() {
    const job = await this.jobs.claimNext();
    if (!job) return { job: null };
    return {
      job: {
        id: job.id,
        scriptRelativePath: job.scriptRelativePath,
        payload: job.payload ?? null,
        state: job.state,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
      },
    };
  }

  @Get('stats')
  async stats() {
    return { counts: await this.jobs.internalJobCounts() };
  }

  @Get(':id/cancellation-requested')
  async cancellationRequested(@Param('id', ParseUUIDPipe) id: string) {
    return this.jobs.getCancellationRequestedForWorker(id);
  }

  /** Polled by the ops PayTM wrapper (`run_paytm_bot.py --defer-anchors`) until anchors are submitted on the job page — not used by native thin TP_*.py scripts. */
  @Get(':id/anchor')
  async anchor(@Param('id', ParseUUIDPipe) id: string) {
    return this.jobs.getAnchorForWorker(id);
  }

  @Post(':id/logs')
  async appendLogs(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AppendLogsDto,
  ) {
    await this.jobs.appendLogs(id, body.lines);
    return { ok: true };
  }

  @Post(':id/finish')
  async finish(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: FinishJobDto,
  ) {
    return this.jobs.finish(id, body.exitCode, body.error, {
      cancelled: Boolean(body.cancelled),
    });
  }
}
