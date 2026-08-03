import type { UserRecord } from '../../users/interfaces/user-record.interface.js';
import type { RequestMetadata } from './auth-token.interface.js';

export const AUTH_REPOSITORY = Symbol('AUTH_REPOSITORY');

export interface RefreshSessionRecord {
  id: string;
  userId: string;
  familyId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  user: UserRecord;
}

export interface NewSessionInput extends RequestMetadata {
  id: string;
  userId: string;
  familyId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface NewUserInput {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phone: string | null;
}

export interface NewOneTimeTokenInput {
  tokenHash: string;
  expiresAt: Date;
}

export interface AuthRepository {
  findUserByEmail(email: string): Promise<UserRecord | null>;
  findUserById(id: string): Promise<UserRecord | null>;
  createRegistration(
    user: NewUserInput,
    verificationToken: NewOneTimeTokenInput,
    metadata: RequestMetadata,
  ): Promise<UserRecord>;
  markLogin(userId: string, metadata: RequestMetadata): Promise<void>;
  createSession(input: NewSessionInput): Promise<RefreshSessionRecord>;
  findSessionById(id: string): Promise<RefreshSessionRecord | null>;
  rotateSession(
    currentSessionId: string,
    currentTokenHash: string,
    replacement: NewSessionInput,
  ): Promise<RefreshSessionRecord | null>;
  revokeSession(id: string, reason: string): Promise<void>;
  revokeSessionFamily(familyId: string, reason: string): Promise<void>;
  revokeAllUserSessions(userId: string, reason: string): Promise<void>;
  replaceEmailVerificationToken(userId: string, token: NewOneTimeTokenInput): Promise<void>;
  consumeEmailVerificationToken(tokenHash: string, now: Date): Promise<UserRecord | null>;
  replacePasswordResetToken(userId: string, token: NewOneTimeTokenInput): Promise<void>;
  consumePasswordResetToken(tokenHash: string, passwordHash: string, now: Date): Promise<boolean>;
  createAuditEvent(input: {
    action: string;
    actorId?: string;
    targetUserId?: string;
    metadata?: Record<string, string | number | boolean | null>;
    request: RequestMetadata;
  }): Promise<void>;
}
