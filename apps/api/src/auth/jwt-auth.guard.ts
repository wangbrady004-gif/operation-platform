import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from './public.decorator';

/**
 * JWT from `Authorization: Bearer` or (for EventSource) `?access_token=`.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    const req = context.switchToHttp().getRequest<{ query?: { access_token?: string }; headers?: { authorization?: string } }>();
    const token = req.query?.access_token;
    if (typeof token === 'string' && token.length > 0) {
      const h = req.headers ?? {};
      if (!h.authorization) {
        h.authorization = `Bearer ${token}`;
      }
      req.headers = h;
    }
    return super.canActivate(context);
  }
}
