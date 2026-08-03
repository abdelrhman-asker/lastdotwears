import {
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator.js';
import { ACCESS_TOKEN_COOKIE } from '../services/auth-cookie.service.js';
import { AuthService } from '../services/auth.service.js';
import { readCookie } from '../utils/request.util.js';

type AuthenticatedRequest = Request & {
  authenticatedUser?: Awaited<ReturnType<AuthService['validateAccessToken']>>;
};

@Injectable()
export class JwtAuthenticationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException('Authentication is required.');
    }

    const user = await this.authService.validateAccessToken(token);
    if (!user) {
      throw new UnauthorizedException('The session is invalid or expired.');
    }

    request.authenticatedUser = user;
    return true;
  }

  private extractToken(request: Request): string | null {
    const cookieToken = readCookie(request, ACCESS_TOKEN_COOKIE);
    if (cookieToken) {
      return cookieToken;
    }

    const authorization = request.headers.authorization;
    if (!authorization) {
      return null;
    }
    const [scheme, token] = authorization.split(' ');
    return scheme?.toLowerCase() === 'bearer' && token ? token : null;
  }
}
