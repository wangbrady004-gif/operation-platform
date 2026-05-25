import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

@Injectable()
export class InternalTokenGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const token = this.config.get<string>('INTERNAL_API_TOKEN', '');
    if (!token) {
      throw new UnauthorizedException(
        'INTERNAL_API_TOKEN is not set on the API server',
      );
    }
    const req = context.switchToHttp().getRequest<Request>();
    const header =
      (req.headers['x-internal-token'] as string | undefined) ||
      (typeof req.headers.authorization === 'string'
        ? req.headers.authorization.replace(/^Bearer\s+/i, '')
        : undefined);
    if (!header || header !== token) {
      throw new UnauthorizedException('Invalid internal token');
    }
    return true;
  }
}
