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
import { CreatePaytmMerchantDto } from './dto/create-paytm-merchant.dto';
import { UpdatePaytmMerchantDto } from './dto/update-paytm-merchant.dto';
import { PaytmMerchantsService } from './paytm-merchants.service';

@Controller('paytm-merchants')
@UseGuards(RolesGuard)
export class PaytmMerchantsController {
  constructor(
    private readonly merchants: PaytmMerchantsService,
    private readonly audit: AuditService,
  ) {}

  /** Operators choose merchant + profile (no secrets). */
  @Get()
  @Roles(UserRole.viewer, UserRole.operator, UserRole.admin)
  listForJobs() {
    return this.merchants.listSafe();
  }

  /** PayTM wizard: decrypted mobile/password for manual login — audited. Viewer cannot call. */
  @Get('operators/:id/login-assist')
  @Roles(UserRole.operator, UserRole.admin)
  async getOperatorLoginAssist(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: JwtPayloadUser },
  ) {
    const row = await this.merchants.getOperatorLoginAssist(id);
    void this.audit.log({
      action: 'paytm_merchant.operator_login_assist',
      actorEmail: req.user.email,
      resourceType: 'paytm_merchant',
      resourceId: id,
      payload: { profileKey: row.profileKey },
    });
    return row;
  }

  @Get('admin')
  @Roles(UserRole.admin)
  listAdmin() {
    return this.merchants.listAdmin();
  }

  @Get('admin/:id')
  @Roles(UserRole.admin)
  async getAdminDetail(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: JwtPayloadUser },
  ) {
    const row = await this.merchants.getAdminDetail(id);
    void this.audit.log({
      action: 'paytm_merchant.view_secrets',
      actorEmail: req.user.email,
      resourceType: 'paytm_merchant',
      resourceId: id,
      payload: { profileKey: row.profileKey },
    });
    return row;
  }

  @Post('admin')
  @Roles(UserRole.admin)
  async createAdmin(
    @Body() dto: CreatePaytmMerchantDto,
    @Req() req: Request & { user: JwtPayloadUser },
  ) {
    const row = await this.merchants.create(dto);
    void this.audit.log({
      action: 'paytm_merchant.create',
      actorEmail: req.user.email,
      resourceType: 'paytm_merchant',
      resourceId: row.id,
      payload: { profileKey: row.profileKey },
    });
    return this.merchants.toPublicRow(row);
  }

  @Patch('admin/:id')
  @Roles(UserRole.admin)
  async updateAdmin(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePaytmMerchantDto,
    @Req() req: Request & { user: JwtPayloadUser },
  ) {
    const row = await this.merchants.update(id, dto);
    void this.audit.log({
      action: 'paytm_merchant.update',
      actorEmail: req.user.email,
      resourceType: 'paytm_merchant',
      resourceId: id,
      payload: { profileKey: row.profileKey },
    });
    return this.merchants.toPublicRow(row);
  }

  @Delete('admin/:id')
  @Roles(UserRole.admin)
  async deleteAdmin(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: JwtPayloadUser },
  ) {
    const row = await this.merchants.remove(id);
    void this.audit.log({
      action: 'paytm_merchant.delete',
      actorEmail: req.user.email,
      resourceType: 'paytm_merchant',
      resourceId: id,
      payload: { profileKey: row.profileKey },
    });
    return { ok: true as const, id: row.id };
  }
}
