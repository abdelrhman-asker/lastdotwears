import { randomUUID } from 'node:crypto';

import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';

import { AuthTokenService } from './auth-token.service.js';

describe('AuthTokenService', () => {
  const values: Record<string, string | number> = {
    REFRESH_TOKEN_PEPPER: 'refresh-pepper-long-enough-for-tests',
    ONE_TIME_TOKEN_PEPPER: 'one-time-pepper-long-enough-for-tests',
    REFRESH_TOKEN_TTL_DAYS: 30,
    EMAIL_VERIFICATION_TTL_HOURS: 24,
    PASSWORD_RESET_TTL_MINUTES: 30,
  };
  const config = {
    getOrThrow: (key: string) => values[key],
  } as unknown as ConfigService;
  const jwt = {} as JwtService;
  const service = new AuthTokenService(jwt, config);

  it('issues refresh tokens containing only an id and high-entropy secret', () => {
    const sessionId = randomUUID();
    const issued = service.createRefreshToken(sessionId);

    expect(service.parseRefreshToken(issued.token)).toEqual({ sessionId });
    expect(issued.tokenHash).toHaveLength(64);
    expect(issued.tokenHash).not.toContain(sessionId);
  });

  it('rejects malformed refresh tokens', () => {
    expect(service.parseRefreshToken('invalid')).toBeNull();
    expect(service.parseRefreshToken(`${randomUUID()}.short`)).toBeNull();
  });

  it('uses deterministic HMAC hashes and constant-time compatible comparison', () => {
    const first = service.hashOneTimeToken('opaque-token');
    const second = service.hashOneTimeToken('opaque-token');

    expect(first).toBe(second);
    expect(service.tokenHashMatches(first, second)).toBe(true);
    expect(service.tokenHashMatches(first, '00'.repeat(32))).toBe(false);
    expect(service.tokenHashMatches(first, '00')).toBe(false);
  });
});
