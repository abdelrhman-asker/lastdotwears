import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Response } from 'express';

import type { IssuedSessionTokens } from '../interfaces/auth-token.interface.js';

export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';
export const CSRF_TOKEN_COOKIE = 'csrf_token';

@Injectable()
export class AuthCookieService {
  constructor(private readonly configService: ConfigService) {}

  setSessionCookies(response: Response, tokens: IssuedSessionTokens): void {
    response.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
      ...this.baseOptions(),
      httpOnly: true,
      maxAge: this.configService.getOrThrow<number>('JWT_ACCESS_TTL_SECONDS') * 1000,
      path: '/',
    });
    response.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
      ...this.baseOptions(),
      httpOnly: true,
      maxAge: this.configService.getOrThrow<number>('REFRESH_TOKEN_TTL_DAYS') * 24 * 60 * 60 * 1000,
      path: '/api/v1',
    });
    response.cookie(CSRF_TOKEN_COOKIE, tokens.csrfToken, {
      ...this.baseOptions(),
      httpOnly: false,
      maxAge: this.configService.getOrThrow<number>('REFRESH_TOKEN_TTL_DAYS') * 24 * 60 * 60 * 1000,
      path: '/',
    });
  }

  clearSessionCookies(response: Response): void {
    response.clearCookie(ACCESS_TOKEN_COOKIE, { ...this.baseOptions(), path: '/' });
    response.clearCookie(REFRESH_TOKEN_COOKIE, { ...this.baseOptions(), path: '/api/v1' });
    response.clearCookie(CSRF_TOKEN_COOKIE, { ...this.baseOptions(), path: '/' });
  }

  private baseOptions(): CookieOptions {
    return {
      sameSite: 'lax',
      secure: this.configService.getOrThrow<string>('NODE_ENV') === 'production',
    };
  }
}
