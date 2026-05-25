import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import {
  UserEntity,
  UserRole,
  UserStatus,
} from '../entities/user.entity';
import type { JwtPayloadUser } from './jwt-payload';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureBootstrapAdmin();
  }

  private async ensureBootstrapAdmin(): Promise<void> {
    const count = await this.users.count();
    if (count > 0) return;
    const emailRaw = this.config.get<string>('INIT_ADMIN_EMAIL', 'admin@localhost');
    const email = emailRaw.trim().toLowerCase();
    const password = this.config.get<string>('INIT_ADMIN_PASSWORD', '');
    if (!password) {
      this.logger.warn(
        'No users in database and INIT_ADMIN_PASSWORD is empty — set it to create the first admin, or insert a user manually.',
      );
      return;
    }
    const hash = await bcrypt.hash(password, 12);
    await this.users.save(
      this.users.create({
        email,
        passwordHash: hash,
        role: UserRole.admin,
        status: UserStatus.active,
      }),
    );
    this.logger.log(`Bootstrap admin created: ${email}`);
  }

  async validateUser(email: string, pass: string): Promise<UserEntity | null> {
    const user = await this.users.findOne({
      where: { email: email.trim().toLowerCase() },
    });
    if (!user) return null;
    const ok = await bcrypt.compare(pass, user.passwordHash);
    if (!ok) return null;
    return user;
  }

  async login(
    email: string,
    password: string,
    clientIp?: string | null,
  ): Promise<{ access_token: string }> {
    const user = await this.validateUser(email, password);
    if (!user) {
      await this.audit.log({
        action: 'auth.login_failed',
        payload: { email: email.trim().toLowerCase() },
        clientIp: clientIp ?? null,
      });
      throw new UnauthorizedException('Invalid credentials');
    }
    if (user.status !== UserStatus.active) {
      await this.audit.log({
        action: 'auth.login_blocked_inactive',
        actorEmail: user.email,
        clientIp: clientIp ?? null,
      });
      throw new UnauthorizedException('This account has been deactivated.');
    }
    const payload: JwtPayloadUser = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    await this.audit.log({
      action: 'auth.login',
      actorEmail: user.email,
      clientIp: clientIp ?? null,
    });
    return {
      access_token: this.jwt.sign(payload as object),
    };
  }

  /** Password hashes omitted — Team page roster for admins only. */
  async listUsers(): Promise<
    {
      id: string;
      email: string;
      role: UserRole;
      status: UserStatus;
      createdAt: Date;
    }[]
  > {
    return this.users.find({
      order: { email: 'ASC' },
      select: ['id', 'email', 'role', 'status', 'createdAt'],
    });
  }

  async createUser(
    dto: { email: string; password: string; role: UserRole },
    actorEmail: string | null,
  ): Promise<{ id: string; email: string; role: UserRole; status: UserStatus }> {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.users.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    const hash = await bcrypt.hash(dto.password, 12);
    const u = await this.users.save(
      this.users.create({
        email,
        passwordHash: hash,
        role: dto.role,
        status: UserStatus.active,
      }),
    );
    await this.audit.log({
      action: 'auth.user_create',
      actorEmail,
      resourceType: 'user',
      resourceId: u.id,
      payload: { email: u.email, role: u.role },
    });
    return { id: u.id, email: u.email, role: u.role, status: u.status };
  }

  async setUserStatus(
    userId: string,
    next: UserStatus,
    actor: JwtPayloadUser,
  ): Promise<{ id: string; email: string; role: UserRole; status: UserStatus }> {
    const u = await this.users.findOne({ where: { id: userId } });
    if (!u) throw new NotFoundException(`User ${userId} not found`);
    if (actor.sub === userId && next !== UserStatus.active) {
      throw new ForbiddenException('You cannot deactivate your own account.');
    }
    if (u.status === next) return { id: u.id, email: u.email, role: u.role, status: u.status };
    const prev = u.status;
    u.status = next;
    await this.users.save(u);
    await this.audit.log({
      action: 'auth.user_status',
      actorEmail: actor.email,
      resourceType: 'user',
      resourceId: u.id,
      payload: {
        email: u.email,
        previousStatus: prev,
        status: next,
      },
    });
    return { id: u.id, email: u.email, role: u.role, status: u.status };
  }
}
