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
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../entities/user.entity';
import type { JwtPayloadUser } from '../auth/jwt-payload';
import { OpsLaunchersService } from './ops-launchers.service';

@Controller('ops-launchers')
@UseGuards(RolesGuard)
export class OpsLaunchersController {
  constructor(private readonly service: OpsLaunchersService) {}

  @Get()
  @Roles(UserRole.operator, UserRole.admin)
  list() {
    return this.service.list();
  }

  @Post('record')
  @Roles(UserRole.operator, UserRole.admin)
  record(
    @Body() body: { launcherId: string; botRoot?: string | null },
    @Req() req: Request & { user: JwtPayloadUser },
  ) {
    return this.service.recordGeneration(body.launcherId, body.botRoot ?? null, req.user.email);
  }

  @Patch(':id/mark-update')
  @Roles(UserRole.admin)
  markForUpdate(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.markForUpdate(id);
  }

  @Delete(':id')
  @Roles(UserRole.admin)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
