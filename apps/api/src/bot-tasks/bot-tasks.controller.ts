import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { Public } from '../auth/public.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../entities/user.entity';
import type { JwtPayloadUser } from '../auth/jwt-payload';
import { BotTasksService } from './bot-tasks.service';
import { CreateBotTaskDto } from './dto/create-bot-task.dto';
import { OpsLaunchersService } from '../ops-launchers/ops-launchers.service';

@Controller('bot-tasks')
export class BotTasksController {
  constructor(
    private readonly service: BotTasksService,
    private readonly config: ConfigService,
    private readonly opsLaunchers: OpsLaunchersService,
  ) {}

  private verifyLauncherKey(req: Request): string {
    const key = this.config.get<string>('LAUNCHER_KEY') ?? '';
    const incoming = (req.headers as Record<string, string>)['x-launcher-key'] ?? '';
    if (!key || incoming !== key) throw new UnauthorizedException('Invalid launcher key');
    const launcherId = (req.headers as Record<string, string>)['x-launcher-id'] ?? 'unknown';
    return launcherId;
  }

  // ── JWT-protected routes ────────────────────────────────────────────────────

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.operator, UserRole.admin)
  create(
    @Body() dto: CreateBotTaskDto,
    @Req() req: Request & { user: JwtPayloadUser },
  ) {
    return this.service.create(dto, req.user.email);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.operator, UserRole.admin)
  listActive() {
    return this.service.listActive();
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.operator, UserRole.admin)
  requestStop(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.requestStop(id);
  }

  // ── Launcher-key-protected routes (no JWT — called from ops launcher EXE) ──

  @Public()
  @Post('claim')
  async claimNext(@Req() req: Request) {
    const launcherId = this.verifyLauncherKey(req);
    // Heartbeat — fire-and-forget, don't block the claim response
    void this.opsLaunchers.touchLastSeen(launcherId);
    return this.service.claimNext(launcherId);
  }

  @Public()
  @Get('stop-requests')
  getStopRequests(@Req() req: Request) {
    const launcherId = this.verifyLauncherKey(req);
    return this.service.getStopRequests(launcherId);
  }

  @Public()
  @Patch(':id/done')
  markDone(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    this.verifyLauncherKey(req);
    return this.service.markDone(id);
  }
}
