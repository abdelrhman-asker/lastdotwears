import type { ConfigService } from '@nestjs/config';

import type { MailService } from '../../mail/interfaces/mail-service.interface.js';
import type { UserRecord } from '../../users/interfaces/user-record.interface.js';
import type { AuthRepository, NewSessionInput } from '../interfaces/auth-repository.interface.js';
import type { RequestMetadata } from '../interfaces/auth-token.interface.js';
import type { AuthTokenService } from './auth-token.service.js';
import { AuthService } from './auth.service.js';
import type { PasswordService } from './password.service.js';

const requestMetadata: RequestMetadata = {
  ipAddress: '127.0.0.1',
  userAgent: 'unit-test',
};

const activeCustomer: UserRecord = {
  id: 'ad219839-8880-4ebe-a4a7-d65c74c0d22c',
  email: 'customer@example.com',
  passwordHash: 'stored-password-hash',
  firstName: 'Sample',
  lastName: 'Customer',
  phone: null,
  role: 'CUSTOMER',
  status: 'ACTIVE',
  isEmailVerified: true,
  emailVerifiedAt: new Date('2026-01-01T00:00:00Z'),
  lastLoginAt: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

function createFixture(user: UserRecord | null = activeCustomer) {
  const state = {
    auditEvents: [] as Parameters<AuthRepository['createAuditEvent']>[0][],
    dummyVerificationCount: 0,
    loginMarks: [] as Array<{ userId: string; metadata: RequestMetadata }>,
    sessions: [] as NewSessionInput[],
  };
  const repositoryMock = {
    findUserByEmail: () => Promise.resolve(user),
    markLogin: (userId: string, metadata: RequestMetadata) => {
      state.loginMarks.push({ userId, metadata });
      return Promise.resolve();
    },
    createSession: (input: NewSessionInput) => {
      state.sessions.push(input);
      return Promise.resolve({
        id: input.id,
        userId: input.userId,
        familyId: input.familyId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
        revokedAt: null,
        user: user ?? activeCustomer,
      });
    },
    createAuditEvent: (input: Parameters<AuthRepository['createAuditEvent']>[0]) => {
      state.auditEvents.push(input);
      return Promise.resolve();
    },
  };
  const passwordMock = {
    verify: () => Promise.resolve(true),
    verifyDummy: () => {
      state.dummyVerificationCount += 1;
      return Promise.resolve();
    },
  };
  const tokenMock = {
    createRefreshToken: () => ({
      token: 'refresh-token',
      tokenHash: 'refresh-token-hash',
    }),
    refreshTokenExpiresAt: () => new Date('2026-09-01T00:00:00Z'),
    createCsrfToken: () => 'csrf-token',
    signAccessToken: () => Promise.resolve('access-token'),
  };
  const service = new AuthService(
    repositoryMock as unknown as AuthRepository,
    {} as MailService,
    passwordMock as unknown as PasswordService,
    tokenMock as unknown as AuthTokenService,
    {} as ConfigService,
  );

  return { service, state };
}

describe('AuthService login', () => {
  it('creates a server-side session after valid customer credentials', async () => {
    const { service, state } = createFixture();

    const result = await service.login(
      { email: activeCustomer.email, password: 'A-secure-password!42' },
      requestMetadata,
    );

    expect(result.user).not.toHaveProperty('passwordHash');
    expect(result.tokens).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      csrfToken: 'csrf-token',
    });
    expect(state.loginMarks).toEqual([{ userId: activeCustomer.id, metadata: requestMetadata }]);
    expect(state.sessions).toHaveLength(1);
  });

  it('performs dummy password work and emits a generic error for an unknown email', async () => {
    const { service, state } = createFixture(null);

    await expect(
      service.login(
        { email: 'unknown@example.com', password: 'A-secure-password!42' },
        requestMetadata,
      ),
    ).rejects.toThrow('Invalid email or password.');

    expect(state.dummyVerificationCount).toBe(1);
    expect(state.auditEvents).toEqual([expect.objectContaining({ action: 'USER_LOGIN_FAILED' })]);
    expect(state.sessions).toHaveLength(0);
  });

  it('never creates a session for a blocked account', async () => {
    const blockedUser: UserRecord = { ...activeCustomer, status: 'BLOCKED' };
    const { service, state } = createFixture(blockedUser);

    await expect(
      service.login(
        { email: blockedUser.email, password: 'A-secure-password!42' },
        requestMetadata,
      ),
    ).rejects.toThrow('Invalid email or password.');

    expect(state.auditEvents).toEqual([
      expect.objectContaining({ action: 'USER_LOGIN_FAILED', actorId: blockedUser.id }),
    ]);
    expect(state.sessions).toHaveLength(0);
  });
});
