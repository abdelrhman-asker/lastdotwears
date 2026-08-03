import { Injectable } from '@nestjs/common';

import type { User as PrismaUser } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../database/prisma/prisma.service.js';
import type { RequestMetadata } from '../../auth/interfaces/auth-token.interface.js';
import {
  toPublicUser,
  type UserRecord,
  type UserStatus,
} from '../interfaces/user-record.interface.js';
import type {
  UserListQuery,
  UserListResult,
  UsersRepository,
} from '../interfaces/users-repository.interface.js';

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

@Injectable()
export class PrismaUsersRepository implements UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<UserRecord | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? mapUser(user) : null;
  }

  async updateProfile(
    id: string,
    input: { firstName?: string; lastName?: string; phone?: string | null },
  ): Promise<UserRecord> {
    const user = await this.prisma.user.update({
      where: { id },
      data: input,
    });
    return mapUser(user);
  }

  async listCustomers(query: UserListQuery): Promise<UserListResult> {
    const where = {
      role: 'CUSTOMER' as const,
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { email: { contains: query.search, mode: 'insensitive' as const } },
              { firstName: { contains: query.search, mode: 'insensitive' as const } },
              { lastName: { contains: query.search, mode: 'insensitive' as const } },
              { phone: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: users.map((user) => toPublicUser(mapUser(user))),
      total,
    };
  }

  async setStatus(
    targetUserId: string,
    status: UserStatus,
    actorId: string,
    reason: string | null,
    request: RequestMetadata,
  ): Promise<UserRecord | null> {
    return this.prisma.$transaction(async (transaction) => {
      const existing = await transaction.user.findFirst({
        where: { id: targetUserId, role: 'CUSTOMER' },
      });

      if (!existing) {
        return null;
      }

      const user = await transaction.user.update({
        where: { id: targetUserId },
        data: { status },
      });

      if (status === 'BLOCKED') {
        await transaction.refreshSession.updateMany({
          where: { userId: targetUserId, revokedAt: null },
          data: { revokedAt: new Date(), revocationReason: 'USER_BLOCKED' },
        });
      }

      await transaction.auditLog.create({
        data: {
          actorId,
          targetUserId,
          action: status === 'BLOCKED' ? 'CUSTOMER_BLOCKED' : 'CUSTOMER_UNBLOCKED',
          metadata: reason ? { reason } : undefined,
          ipAddress: request.ipAddress,
          userAgent: request.userAgent,
        },
      });

      return mapUser(user);
    });
  }
}
