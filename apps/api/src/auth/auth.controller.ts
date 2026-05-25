import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuditService } from '../audit/audit.service';
import { UserRole } from '../entities/user.entity';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import type { JwtPayloadUser } from './jwt-payload';
import { Public } from './public.decorator';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly audit: AuditService,
  ) {}

  @Public()
  @Post('login')
  login(@Body() body: LoginDto, @Req() req: Request) {
    const ip =
      (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      null;
    return this.auth.login(body.email, body.password, ip);
  }

  @Get('me')
  me(@Req() req: Request & { user: JwtPayloadUser }) {
    return req.user;
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.admin)
  @Get('audit')
  async auditLog() {
    return this.audit.recent(200);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.admin)
  @Get('users')
  listUsers() {
    return this.auth.listUsers();
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.admin)
  @Post('users')
  createUser(
    @Body() body: CreateUserDto,
    @Req() req: Request & { user: JwtPayloadUser },
  ) {
    return this.auth.createUser(body, req.user.email);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.admin)
  @Patch('users/:id/status')
  setUserStatus(
    @Param('id') userId: string,
    @Body() body: UpdateUserStatusDto,
    @Req() req: Request & { user: JwtPayloadUser },
  ) {
    return this.auth.setUserStatus(userId, body.status, req.user);
  }
}
