import { Injectable } from '@nestjs/common';

import type {
  RefreshSession as PrismaRefreshSession,
  User as PrismaUser,
} from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../database/prisma/prisma.service.js';
import type { UserRecord } from '../../users/interfaces/user-record.interface.js';
import type {
  AuthRepository,
  NewOneTimeTokenInput,
  NewSessionInput,
  NewUserInput,
  RefreshSessionRecord,
} from '../interfaces/auth-repository.interface.js';
import type { RequestMetadata } from '../interfaces/auth-token.interface.js';

type SessionWithUser = PrismaRefreshSession & { user: PrismaUser };

function mapUser(user: PrismaUser): UserRecord {
  return {
    id: user.id,
    email: user.email,
    passwordHash: user.passwordHash,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    role: user.role,
    status: user.status,
    isEmailVerified: user.isEmailVerified,
    emailVerifiedAt: user.emailVerifiedAt,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function mapSession(session: SessionWithUser): RefreshSessionRecord {
  return {
    id: session.id,
    userId: session.userId,
    familyId: session.familyId,
    tokenHash: session.tokenHash,
    expiresAt: session.expiresAt,
    revokedAt: session.revokedAt,
    user: mapUser(session.user),
  };
}

@Injectable()
export class PrismaAuthRepository implements AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    return user ? mapUser(user) : null;
  }

  async findUserById(id: string): Promise<UserRecord | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? mapUser(user) : null;
  }

  async createRegistration(
    userInput: NewUserInput,
    verificationToken: NewOneTimeTokenInput,
    metadata: RequestMetadata,
  ): Promise<UserRecord> {
    return this.prisma.$transaction(async (transaction) => {
      const user = await transaction.user.create({
        data: {
          email: userInput.email,
          passwordHash: userInput.passwordHash,
          firstName: userInput.firstName,
          lastName: userInput.lastName,
          phone: userInput.phone,
        },
      });

      await transaction.emailVerificationToken.create({
        data: {
          userId: user.id,
          tokenHash: verificationToken.tokenHash,
          expiresAt: verificationToken.expiresAt,
        },
      });

      await transaction.auditLog.create({
        data: {
          actorId: user.id,
          targetUserId: user.id,
          action: 'USER_REGISTERED',
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
        },
      });

      return mapUser(user);
    });
  }

  async markLogin(userId: string, metadata: RequestMetadata): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { lastLoginAt: new Date() },
      }),
      this.prisma.auditLog.create({
        data: {
          actorId: userId,
          targetUserId: userId,
          action: 'USER_LOGIN_SUCCEEDED',
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
        },
      }),
    ]);
  }

  async createSession(input: NewSessionInput): Promise<RefreshSessionRecord> {
    const session = await this.prisma.refreshSession.create({
      data: input,
      include: { user: true },
    });
    return mapSession(session);
  }

  async findSessionById(id: string): Promise<RefreshSessionRecord | null> {
    const session = await this.prisma.refreshSession.findUnique({
      where: { id },
      include: { user: true },
    });
    return session ? mapSession(session) : null;
  }

  async rotateSession(
    currentSessionId: string,
    currentTokenHash: string,
    replacement: NewSessionInput,
  ): Promise<RefreshSessionRecord | null> {
    return this.prisma.$transaction(async (transaction) => {
      const now = new Date();
      const update = await transaction.refreshSession.updateMany({
        where: {
          id: currentSessionId,
          tokenHash: currentTokenHash,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        data: {
          revokedAt: now,
          lastUsedAt: now,
          replacedById: replacement.id,
          revocationReason: 'ROTATED',
        },
      });

      if (update.count !== 1) {
        return null;
      }

      const session = await transaction.refreshSession.create({
        data: replacement,
        include: { user: true },
      });

      return mapSession(session);
    });
  }

  async revokeSession(id: string, reason: string): Promise<void> {
    await this.prisma.refreshSession.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: new Date(), revocationReason: reason },
    });
  }

  async revokeSessionFamily(familyId: string, reason: string): Promise<void> {
    await this.prisma.refreshSession.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date(), revocationReason: reason },
    });
  }

  async revokeAllUserSessions(userId: string, reason: string): Promise<void> {
    await this.prisma.refreshSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date(), revocationReason: reason },
    });
  }

  async replaceEmailVerificationToken(userId: string, token: NewOneTimeTokenInput): Promise<void> {
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.emailVerificationToken.updateMany({
        where: { userId, consumedAt: null },
        data: { consumedAt: now },
      }),
      this.prisma.emailVerificationToken.create({
        data: { userId, tokenHash: token.tokenHash, expiresAt: token.expiresAt },
      }),
    ]);
  }

  async consumeEmailVerificationToken(tokenHash: string, now: Date): Promise<UserRecord | null> {
    return this.prisma.$transaction(async (transaction) => {
      const token = await transaction.emailVerificationToken.findUnique({
        where: { tokenHash },
      });

      if (!token || token.consumedAt || token.expiresAt <= now) {
        return null;
      }

      const consumed = await transaction.emailVerificationToken.updateMany({
        where: { id: token.id, consumedAt: null, expiresAt: { gt: now } },
        data: { consumedAt: now },
      });

      if (consumed.count !== 1) {
        return null;
      }

      const user = await transaction.user.update({
        where: { id: token.userId },
        data: { isEmailVerified: true, emailVerifiedAt: now },
      });

      await transaction.auditLog.create({
        data: {
          actorId: user.id,
          targetUserId: user.id,
          action: 'EMAIL_VERIFIED',
        },
      });

      return mapUser(user);
    });
  }

  async replacePasswordResetToken(userId: string, token: NewOneTimeTokenInput): Promise<void> {
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.passwordResetToken.updateMany({
        where: { userId, consumedAt: null },
        data: { consumedAt: now },
      }),
      this.prisma.passwordResetToken.create({
        data: { userId, tokenHash: token.tokenHash, expiresAt: token.expiresAt },
      }),
    ]);
  }

  async consumePasswordResetToken(
    tokenHash: string,
    passwordHash: string,
    now: Date,
  ): Promise<boolean> {
    return this.prisma.$transaction(async (transaction) => {
      const token = await transaction.passwordResetToken.findUnique({ where: { tokenHash } });

      if (!token || token.consumedAt || token.expiresAt <= now) {
        return false;
      }

      const consumed = await transaction.passwordResetToken.updateMany({
        where: { id: token.id, consumedAt: null, expiresAt: { gt: now } },
        data: { consumedAt: now },
      });

      if (consumed.count !== 1) {
        return false;
      }

      await transaction.user.update({
        where: { id: token.userId },
        data: { passwordHash },
      });
      await transaction.refreshSession.updateMany({
        where: { userId: token.userId, revokedAt: null },
        data: { revokedAt: now, revocationReason: 'PASSWORD_RESET' },
      });
      await transaction.auditLog.create({
        data: {
          actorId: token.userId,
          targetUserId: token.userId,
          action: 'PASSWORD_RESET_COMPLETED',
        },
      });

      return true;
    });
  }

  async createAuditEvent(input: {
    action: string;
    actorId?: string;
    targetUserId?: string;
    metadata?: Record<string, string | number | boolean | null>;
    request: RequestMetadata;
  }): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        action: input.action,
        actorId: input.actorId,
        targetUserId: input.targetUserId,
        metadata: input.metadata,
        ipAddress: input.request.ipAddress,
        userAgent: input.request.userAgent,
      },
    });
  }
}
