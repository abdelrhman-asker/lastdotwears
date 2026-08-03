import { timingSafeEqual } from 'node:crypto';

import {
  ForbiddenException,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
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
  constructor(private readonly reflector: Reflector) {}

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

    if (!cookieToken || !headerToken || !this.tokensMatch(cookieToken, headerToken)) {
      throw new ForbiddenException('The CSRF token is missing or invalid.');
    }

    return true;
  }

  private tokensMatch(first: string, second: string): boolean {
    const firstBuffer = Buffer.from(first);
    const secondBuffer = Buffer.from(second);
    return firstBuffer.length === secondBuffer.length && timingSafeEqual(firstBuffer, secondBuffer);
  }
}
