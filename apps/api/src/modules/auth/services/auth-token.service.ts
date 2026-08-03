import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import type { UserRecord } from '../../users/interfaces/user-record.interface.js';
import type { AccessTokenPayload } from '../interfaces/auth-token.interface.js';

const refreshTokenPattern =
  /^([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.([A-Za-z0-9_-]{40,})$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

@Injectable()
export class AuthTokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  createOneTimeToken(): { token: string; tokenHash: string } {
    const token = randomBytes(48).toString('base64url');
    return { token, tokenHash: this.hashOneTimeToken(token) };
  }

  createRefreshToken(sessionId: string): { token: string; tokenHash: string } {
    const token = `${sessionId}.${randomBytes(48).toString('base64url')}`;
    return { token, tokenHash: this.hashRefreshToken(token) };
  }

  createCsrfToken(): string {
    return randomBytes(32).toString('base64url');
  }

  parseRefreshToken(token: string): { sessionId: string } | null {
    const match = refreshTokenPattern.exec(token);
    return match?.[1] ? { sessionId: match[1] } : null;
  }

  hashRefreshToken(token: string): string {
    return this.hash(token, this.configService.getOrThrow<string>('REFRESH_TOKEN_PEPPER'));
  }

  hashOneTimeToken(token: string): string {
    return this.hash(token, this.configService.getOrThrow<string>('ONE_TIME_TOKEN_PEPPER'));
  }

  tokenHashMatches(actualHash: string, expectedHash: string): boolean {
    const actual = Buffer.from(actualHash, 'hex');
    const expected = Buffer.from(expectedHash, 'hex');
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }

  async signAccessToken(user: UserRecord, sessionId: string): Promise<string> {
    const payload: AccessTokenPayload = {
      sub: user.id,
      sid: sessionId,
      email: user.email,
      role: user.role,
      type: 'access',
    };

    return this.jwtService.signAsync(payload, {
      expiresIn: this.configService.getOrThrow<number>('JWT_ACCESS_TTL_SECONDS'),
      issuer: this.configService.getOrThrow<string>('JWT_ISSUER'),
      audience: this.configService.getOrThrow<string>('JWT_AUDIENCE'),
    });
  }

  async verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
    try {
      const payload: unknown = await this.jwtService.verifyAsync(token, {
        issuer: this.configService.getOrThrow<string>('JWT_ISSUER'),
        audience: this.configService.getOrThrow<string>('JWT_AUDIENCE'),
      });

      if (
        !isRecord(payload) ||
        typeof payload.sub !== 'string' ||
        typeof payload.sid !== 'string' ||
        typeof payload.email !== 'string' ||
        (payload.role !== 'CUSTOMER' && payload.role !== 'ADMIN') ||
        payload.type !== 'access'
      ) {
        return null;
      }

      return payload as unknown as AccessTokenPayload;
    } catch {
      return null;
    }
  }

  refreshTokenExpiresAt(): Date {
    const days = this.configService.getOrThrow<number>('REFRESH_TOKEN_TTL_DAYS');
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  verificationTokenExpiresAt(): Date {
    const hours = this.configService.getOrThrow<number>('EMAIL_VERIFICATION_TTL_HOURS');
    return new Date(Date.now() + hours * 60 * 60 * 1000);
  }

  passwordResetTokenExpiresAt(): Date {
    const minutes = this.configService.getOrThrow<number>('PASSWORD_RESET_TTL_MINUTES');
    return new Date(Date.now() + minutes * 60 * 1000);
  }

  private hash(token: string, pepper: string): string {
    return createHmac('sha256', pepper).update(token).digest('hex');
  }
}
