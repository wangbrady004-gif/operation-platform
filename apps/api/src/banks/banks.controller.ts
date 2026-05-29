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
import { AuditService } from '../audit/audit.service';
import { CreateBankProfileDto } from './dto/create-bank-profile.dto';
import { UpdateBankProfileDto } from './dto/update-bank-profile.dto';
import { BanksService } from './banks.service';

@Controller('banks')
@UseGuards(RolesGuard)
export class BanksController {
  constructor(
    private readonly banks: BanksService,
    private readonly audit: AuditService,
  ) {}

  /** Operators choose merchant + profile (no secrets). */
  @Get()
  @Roles(UserRole.viewer, UserRole.operator, UserRole.admin)
  listForJobs() {
    return this.banks.listSafe();
  }

  /** Operator login assist: decrypted mobile/password for manual login — audited. Viewer cannot call. */
  @Get('operators/:id/login-assist')
  @Roles(UserRole.operator, UserRole.admin)
  async getOperatorLoginAssist(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: JwtPayloadUser },
  ) {
    const row = await this.banks.getOperatorLoginAssist(id);
    void this.audit.log({
      action: 'bank_profile.operator_login_assist',
      actorEmail: req.user.email,
      resourceType: 'bank_profile',
      resourceId: id,
      payload: { profileKey: row.profileKey },
    });
    return row;
  }

  @Get('admin')
  @Roles(UserRole.admin)
  listAdmin() {
    return this.banks.listAdmin();
  }

  @Get('admin/:id')
  @Roles(UserRole.admin)
  async getAdminDetail(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: JwtPayloadUser },
  ) {
    const row = await this.banks.getAdminDetail(id);
    void this.audit.log({
      action: 'bank_profile.view_secrets',
      actorEmail: req.user.email,
      resourceType: 'bank_profile',
      resourceId: id,
      payload: { profileKey: row.profileKey },
    });
    return row;
  }

  @Post('admin')
  @Roles(UserRole.admin)
  async createAdmin(
    @Body() dto: CreateBankProfileDto,
    @Req() req: Request & { user: JwtPayloadUser },
  ) {
    const row = await this.banks.create(dto);
    void this.audit.log({
      action: 'bank_profile.create',
      actorEmail: req.user.email,
      resourceType: 'bank_profile',
      resourceId: row.id,
      payload: { profileKey: row.profileKey },
    });
    return this.banks.toPublicRow(row);
  }

  @Patch('admin/:id')
  @Roles(UserRole.admin)
  async updateAdmin(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBankProfileDto,
    @Req() req: Request & { user: JwtPayloadUser },
  ) {
    const row = await this.banks.update(id, dto);
    void this.audit.log({
      action: 'bank_profile.update',
      actorEmail: req.user.email,
      resourceType: 'bank_profile',
      resourceId: id,
      payload: { profileKey: row.profileKey },
    });
    return this.banks.toPublicRow(row);
  }

  @Delete('admin/:id')
  @Roles(UserRole.admin)
  async deleteAdmin(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: JwtPayloadUser },
  ) {
    const row = await this.banks.remove(id);
    void this.audit.log({
      action: 'bank_profile.delete',
      actorEmail: req.user.email,
      resourceType: 'bank_profile',
      resourceId: id,
      payload: { profileKey: row.profileKey },
    });
    return { ok: true as const, id: row.id };
  }
}
