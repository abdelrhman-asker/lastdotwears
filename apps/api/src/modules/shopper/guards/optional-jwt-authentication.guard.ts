import {
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';

import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface.js';
import { ACCESS_TOKEN_COOKIE } from '../../auth/services/auth-cookie.service.js';
import { AuthService } from '../../auth/services/auth.service.js';
import { readCookie } from '../../auth/utils/request.util.js';

type OptionallyAuthenticatedRequest = Request & { authenticatedUser?: AuthenticatedUser };

@Injectable()
export class OptionalJwtAuthenticationGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<OptionallyAuthenticatedRequest>();
    const token = this.extractToken(request);
    if (!token) return true;

    const user = await this.authService.validateAccessToken(token);
    if (!user) throw new UnauthorizedException('The session is invalid or expired.');
    request.authenticatedUser = user;
    return true;
  }

  private extractToken(request: Request): string | null {
    const cookieToken = readCookie(request, ACCESS_TOKEN_COOKIE);
    if (cookieToken) return cookieToken;
    const authorization = request.headers.authorization;
    if (!authorization) return null;
    const [scheme, token] = authorization.split(' ');
    return scheme?.toLowerCase() === 'bearer' && token ? token : null;
  }
}
