import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  MessageEvent,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Sse,
  UseGuards,
  Ip,
} from '@nestjs/common';
import type { Request } from 'express';
import { Observable, merge, of } from 'rxjs';
import { UserRole } from '../entities/user.entity';
import type { JwtPayloadUser } from '../auth/jwt-payload';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateJobDto } from './dto/create-job.dto';
import { SubmitPaytmAnchorsDto } from './dto/submit-paytm-anchors.dto';
import { JobLogStreamService } from './job-log-stream.service';
import { JobsService } from './jobs.service';

@Controller('jobs')
@UseGuards(RolesGuard)
export class JobsController {
  constructor(
    private readonly jobs: JobsService,
    private readonly jobLogStream: JobLogStreamService,
  ) {}

  @Post()
  @Roles(UserRole.operator, UserRole.admin)
  create(
    @Body() body: CreateJobDto,
    @Req() req: Request & { user: JwtPayloadUser },
    @Ip() ip: string,
  ) {
    return this.jobs.create(body, {
      email: req.user.email,
      ip: ip || null,
    });
  }

  @Get()
  @Roles(UserRole.viewer, UserRole.operator, UserRole.admin)
  list() {
    return this.jobs.listSummaries();
  }

  /** Reset one stuck `running` session so the worker can attach again (`starting`). Admin only. */
  @Post('admin/:id/requeue-running')
  @Roles(UserRole.admin)
  adminRequeueRunning(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: JwtPayloadUser },
    @Ip() ip: string,
  ) {
    return this.jobs.adminRequeueRunningJob(id, {
      email: req.user.email,
      ip: ip || null,
    });
  }

  @Sse(':id/logs/stream')
  @Roles(UserRole.viewer, UserRole.operator, UserRole.admin)
  logStream(
    @Param('id', ParseUUIDPipe) id: string,
  ): Observable<MessageEvent> {
    const sub = this.jobLogStream.getJobStream(id);
    return merge(
      of({
        data: JSON.stringify({ type: 'connected', jobId: id }),
      } as MessageEvent),
      sub.asObservable(),
    );
  }

  @Get(':id')
  @Roles(UserRole.viewer, UserRole.operator, UserRole.admin)
  getOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('logTail', new DefaultValuePipe(200), ParseIntPipe) logTail: number,
  ) {
    return this.jobs.getById(id, logTail);
  }

  @Post(':id/paytm-anchors')
  @Roles(UserRole.operator, UserRole.admin)
  submitPaytmAnchors(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SubmitPaytmAnchorsDto,
    @Req() req: Request & { user: JwtPayloadUser },
    @Ip() ip: string,
  ) {
    return this.jobs.submitPaytmAnchors(id, body, {
      email: req.user.email,
      ip: ip || null,
    });
  }

  @Post(':id/cancel')
  @Roles(UserRole.operator, UserRole.admin)
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: JwtPayloadUser },
    @Ip() ip: string,
  ) {
    return this.jobs.cancel(id, { email: req.user.email, ip: ip || null });
  }

  @Post('admin/requeue-stuck')
  @Roles(UserRole.admin)
  requeueStuck(
    @Query('minutes', new DefaultValuePipe(2), ParseIntPipe) minutes: number,
  ) {
    return this.jobs.requeueStuckRunning(minutes);
  }
}
