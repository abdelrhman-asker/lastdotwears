import { timingSafeEqual } from 'node:crypto';

import {
  ForbiddenException,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { SKIP_CSRF_KEY } from '../../../common/decorators/skip-csrf.decorator.js';
import {
  ACCESS_TOKEN_COOKIE,
  CSRF_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from '../services/auth-cookie.service.js';
import { readCookie } from '../utils/request.util.js';

const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly trustedOrigins: Set<string>;

  constructor(
    private readonly reflector: Reflector,
    configService: ConfigService,
  ) {
    this.trustedOrigins = new Set(configService.getOrThrow<string[]>('CORS_ORIGINS'));
  }

  canActivate(context: ExecutionContext): boolean {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_CSRF_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    if (safeMethods.has(request.method.toUpperCase())) {
      return true;
    }

    const usesCookieAuthentication =
      Boolean(readCookie(request, ACCESS_TOKEN_COOKIE)) ||
      Boolean(readCookie(request, REFRESH_TOKEN_COOKIE));
    if (!usesCookieAuthentication) {
      return true;
    }

    const cookieToken = readCookie(request, CSRF_TOKEN_COOKIE);
    const header = request.headers['x-csrf-token'];
    const headerToken = Array.isArray(header) ? header[0] : header;

    if (cookieToken && headerToken && this.tokensMatch(cookieToken, headerToken)) {
      return true;
    }

    if (this.isTrustedBrowserRequest(request)) {
      return true;
    }

    throw new ForbiddenException('The CSRF token is missing or invalid.');
  }

  private isTrustedBrowserRequest(request: Request): boolean {
    const origin = request.headers.origin;
    const fetchSite = request.headers['sec-fetch-site'];
    return (
      typeof origin === 'string' &&
      this.trustedOrigins.has(origin) &&
      (fetchSite === 'same-origin' || fetchSite === 'same-site')
    );
  }

  private tokensMatch(first: string, second: string): boolean {
    const firstBuffer = Buffer.from(first);
    const secondBuffer = Buffer.from(second);
    return firstBuffer.length === secondBuffer.length && timingSafeEqual(firstBuffer, secondBuffer);
  }
}
