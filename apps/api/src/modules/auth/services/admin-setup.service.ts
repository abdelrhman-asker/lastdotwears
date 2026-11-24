import { createHash, timingSafeEqual } from 'node:crypto';

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PickType } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { hasPrismaCode } from '../../../common/utils/prisma-error.util.js';
import { PrismaService } from '../../../database/prisma/prisma.service.js';
import { RegisterDto } from '../dto/auth.dto.js';
import { PasswordService } from './password.service.js';

const setupEmail = 'lastdotwears@gmail.com';
// Stable primary key reserved for the completed setup audit event across all API replicas.
const completionId = 'f0ca2151-511e-4f03-9975-2092b927ac26';
const setupSecretFormat = /^[a-f0-9]{64}$/iu;
const existingEmail = { email: { equals: setupEmail, mode: 'insensitive' as const } };

class SetupCredentials extends PickType(RegisterDto, ['email', 'password'] as const) {}

function digest(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

@Injectable()
export class AdminSetupService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
  ) {}

  async assertAvailable(): Promise<void> {
    this.requireEnabledSecret();
    const completed = await this.prisma.auditLog
      .findUnique({ where: { id: completionId }, select: { id: true } })
      .catch(() => {
        throw new ServiceUnavailableException('Administrator setup is temporarily unavailable.');
      });
    if (completed) throw new NotFoundException('Administrator setup is unavailable.');
  }

  async create(body: unknown, origin: string | undefined): Promise<void> {
    const secret = this.requireEnabledSecret();
    const trustedOrigins = this.config.getOrThrow<string[]>('CORS_ORIGINS');
    if (!origin || !trustedOrigins.includes(origin)) {
      throw new ForbiddenException('Administrator setup requires a trusted storefront origin.');
    }
    const input =
      body && typeof body === 'object' && !Array.isArray(body)
        ? (body as Record<string, unknown>)
        : {};
    if (
      typeof input.setupSecret !== 'string' ||
      !setupSecretFormat.test(input.setupSecret) ||
      !timingSafeEqual(digest(secret), digest(input.setupSecret))
    ) {
      throw new ForbiddenException('Invalid setup secret.');
    }

    await this.assertAvailable();
    const credentials = plainToInstance(SetupCredentials, {
      email: input.email,
      password: input.password,
    });
    if (validateSync(credentials, { validationError: { target: false, value: false } }).length) {
      throw new BadRequestException(
        'Enter a valid email and a 12–128 character password with uppercase, lowercase, a number and a symbol.',
      );
    }
    if (credentials.email !== setupEmail) {
      throw new ForbiddenException('This email is not eligible for administrator setup.');
    }
    if (input.confirmPassword !== credentials.password) {
      throw new BadRequestException('Passwords do not match.');
    }

    try {
      const existing = await this.prisma.user.findFirst({
        where: existingEmail,
        select: { id: true },
      });
      if (existing) throw new ConflictException('An account with this email already exists.');

      const passwordHash = await this.passwords.hash(credentials.password);
      await this.prisma.$transaction(async (transaction) => {
        await transaction.auditLog.create({
          data: { id: completionId, action: 'ADMIN_SETUP_COMPLETED' },
          select: { id: true },
        });
        const admin = await transaction.user.create({
          data: {
            email: setupEmail,
            passwordHash,
            firstName: 'Store',
            lastName: 'Administrator',
            role: 'ADMIN',
            status: 'ACTIVE',
            isEmailVerified: true,
            emailVerifiedAt: new Date(),
          },
          select: { id: true },
        });
        await transaction.auditLog.update({
          where: { id: completionId },
          data: { targetUserId: admin.id },
          select: { id: true },
        });
      });
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      if (hasPrismaCode(error, 'P2002')) {
        await this.assertAvailable();
        throw new ConflictException('An account with this email already exists.');
      }
      // Driver errors can include query data. Keep them out of API responses and request logs.
      throw new ServiceUnavailableException('Administrator setup is temporarily unavailable.');
    }
  }

  private requireEnabledSecret(): string {
    const secret = this.config.get<string>('ADMIN_SETUP_SECRET');
    if (
      !this.config.getOrThrow<boolean>('ADMIN_SETUP_ENABLED') ||
      !secret ||
      !setupSecretFormat.test(secret)
    ) {
      throw new NotFoundException('Administrator setup is unavailable.');
    }
    return secret;
  }
}
