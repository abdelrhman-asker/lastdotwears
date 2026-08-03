import { randomUUID } from 'node:crypto';

import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { MAIL_SERVICE, type MailService } from '../../mail/interfaces/mail-service.interface.js';
import {
  toPublicUser,
  type PublicUser,
  type UserRecord,
} from '../../users/interfaces/user-record.interface.js';
import type { EmailRequestDto, LoginDto, RegisterDto, ResetPasswordDto } from '../dto/auth.dto.js';
import { AUTH_REPOSITORY, type AuthRepository } from '../interfaces/auth-repository.interface.js';
import type { AuthenticatedUser } from '../interfaces/authenticated-user.interface.js';
import type { IssuedSessionTokens, RequestMetadata } from '../interfaces/auth-token.interface.js';
import { AuthTokenService } from './auth-token.service.js';
import { PasswordService } from './password.service.js';

export interface AuthenticationResult {
  user: PublicUser;
  tokens: IssuedSessionTokens;
}

function hasPrismaCode(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === code
  );
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(AUTH_REPOSITORY) private readonly repository: AuthRepository,
    @Inject(MAIL_SERVICE) private readonly mailService: MailService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: AuthTokenService,
    private readonly configService: ConfigService,
  ) {}

  async register(input: RegisterDto, request: RequestMetadata): Promise<AuthenticationResult> {
    const existing = await this.repository.findUserByEmail(input.email);
    if (existing) {
      throw new ConflictException('An account with this email already exists.');
    }

    const passwordHash = await this.passwordService.hash(input.password);
    const verification = this.tokenService.createOneTimeToken();
    let user: UserRecord;

    try {
      user = await this.repository.createRegistration(
        {
          email: input.email,
          passwordHash,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone ?? null,
        },
        {
          tokenHash: verification.tokenHash,
          expiresAt: this.tokenService.verificationTokenExpiresAt(),
        },
        request,
      );
    } catch (error) {
      if (hasPrismaCode(error, 'P2002')) {
        throw new ConflictException('An account with this email already exists.');
      }
      throw error;
    }

    await this.sendVerificationEmail(user, verification.token);
    return this.createAuthenticationResult(user, request);
  }

  async login(
    input: LoginDto,
    request: RequestMetadata,
    requiredRole?: 'ADMIN',
  ): Promise<AuthenticationResult> {
    const user = await this.repository.findUserByEmail(input.email);

    if (!user) {
      await this.passwordService.verifyDummy(input.password);
      await this.repository.createAuditEvent({
        action: 'USER_LOGIN_FAILED',
        metadata: { email: input.email },
        request,
      });
      throw new UnauthorizedException('Invalid email or password.');
    }

    const passwordMatches = await this.passwordService.verify(user.passwordHash, input.password);
    if (
      !passwordMatches ||
      user.status === 'BLOCKED' ||
      (requiredRole && user.role !== requiredRole)
    ) {
      await this.repository.createAuditEvent({
        action: 'USER_LOGIN_FAILED',
        actorId: user.id,
        targetUserId: user.id,
        request,
      });
      throw new UnauthorizedException('Invalid email or password.');
    }

    if (requiredRole === 'ADMIN' && !user.isEmailVerified) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    await this.repository.markLogin(user.id, request);
    return this.createAuthenticationResult(user, request);
  }

  async refresh(refreshToken: string, request: RequestMetadata): Promise<AuthenticationResult> {
    const parsed = this.tokenService.parseRefreshToken(refreshToken);
    if (!parsed) {
      throw new UnauthorizedException('The session is invalid or expired.');
    }

    const current = await this.repository.findSessionById(parsed.sessionId);
    const presentedHash = this.tokenService.hashRefreshToken(refreshToken);

    if (!current || !this.tokenService.tokenHashMatches(presentedHash, current.tokenHash)) {
      if (current) {
        await this.repository.revokeSessionFamily(current.familyId, 'TOKEN_REUSE_DETECTED');
      }
      throw new UnauthorizedException('The session is invalid or expired.');
    }

    if (current.revokedAt || current.expiresAt <= new Date() || current.user.status === 'BLOCKED') {
      await this.repository.revokeSessionFamily(current.familyId, 'INVALID_SESSION');
      throw new UnauthorizedException('The session is invalid or expired.');
    }

    const replacementId = randomUUID();
    const replacementToken = this.tokenService.createRefreshToken(replacementId);
    const replacement = await this.repository.rotateSession(current.id, current.tokenHash, {
      id: replacementId,
      userId: current.userId,
      familyId: current.familyId,
      tokenHash: replacementToken.tokenHash,
      expiresAt: this.tokenService.refreshTokenExpiresAt(),
      ...request,
    });

    if (!replacement) {
      await this.repository.revokeSessionFamily(current.familyId, 'TOKEN_REUSE_DETECTED');
      throw new UnauthorizedException('The session is invalid or expired.');
    }

    return {
      user: toPublicUser(replacement.user),
      tokens: {
        accessToken: await this.tokenService.signAccessToken(replacement.user, replacement.id),
        refreshToken: replacementToken.token,
        csrfToken: this.tokenService.createCsrfToken(),
      },
    };
  }

  async logout(refreshToken: string | null): Promise<void> {
    if (!refreshToken) {
      return;
    }

    const parsed = this.tokenService.parseRefreshToken(refreshToken);
    if (!parsed) {
      return;
    }

    const session = await this.repository.findSessionById(parsed.sessionId);
    if (
      session &&
      this.tokenService.tokenHashMatches(
        this.tokenService.hashRefreshToken(refreshToken),
        session.tokenHash,
      )
    ) {
      await this.repository.revokeSession(session.id, 'LOGOUT');
    }
  }

  async validateAccessToken(token: string): Promise<AuthenticatedUser | null> {
    const payload = await this.tokenService.verifyAccessToken(token);
    if (!payload) {
      return null;
    }

    const session = await this.repository.findSessionById(payload.sid);
    if (
      !session ||
      session.userId !== payload.sub ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      session.user.status === 'BLOCKED'
    ) {
      return null;
    }

    return {
      id: session.user.id,
      sessionId: session.id,
      email: session.user.email,
      role: session.user.role,
      status: session.user.status,
      isEmailVerified: session.user.isEmailVerified,
    };
  }

  async currentUser(id: string): Promise<PublicUser> {
    const user = await this.repository.findUserById(id);
    if (!user || user.status === 'BLOCKED') {
      throw new UnauthorizedException('The session is invalid or expired.');
    }
    return toPublicUser(user);
  }

  async verifyEmail(token: string): Promise<PublicUser> {
    const user = await this.repository.consumeEmailVerificationToken(
      this.tokenService.hashOneTimeToken(token),
      new Date(),
    );
    if (!user) {
      throw new BadRequestException('The verification link is invalid or expired.');
    }
    return toPublicUser(user);
  }

  async resendVerification(input: EmailRequestDto): Promise<void> {
    const user = await this.repository.findUserByEmail(input.email);
    if (!user || user.status === 'BLOCKED' || user.isEmailVerified) {
      return;
    }

    const verification = this.tokenService.createOneTimeToken();
    await this.repository.replaceEmailVerificationToken(user.id, {
      tokenHash: verification.tokenHash,
      expiresAt: this.tokenService.verificationTokenExpiresAt(),
    });
    await this.sendVerificationEmail(user, verification.token);
  }

  async forgotPassword(input: EmailRequestDto): Promise<void> {
    const user = await this.repository.findUserByEmail(input.email);
    if (!user || user.status === 'BLOCKED') {
      return;
    }

    const reset = this.tokenService.createOneTimeToken();
    await this.repository.replacePasswordResetToken(user.id, {
      tokenHash: reset.tokenHash,
      expiresAt: this.tokenService.passwordResetTokenExpiresAt(),
    });

    const resetUrl = `${this.configService.getOrThrow<string>('WEB_APP_URL')}/reset-password?token=${encodeURIComponent(reset.token)}`;
    await this.sendMailSafely(() =>
      this.mailService.sendPasswordReset(
        { email: user.email, firstName: user.firstName },
        resetUrl,
      ),
    );
  }

  async resetPassword(input: ResetPasswordDto): Promise<void> {
    const passwordHash = await this.passwordService.hash(input.password);
    const consumed = await this.repository.consumePasswordResetToken(
      this.tokenService.hashOneTimeToken(input.token),
      passwordHash,
      new Date(),
    );
    if (!consumed) {
      throw new BadRequestException('The password reset link is invalid or expired.');
    }
  }

  private async createAuthenticationResult(
    user: UserRecord,
    request: RequestMetadata,
  ): Promise<AuthenticationResult> {
    const sessionId = randomUUID();
    const familyId = randomUUID();
    const refresh = this.tokenService.createRefreshToken(sessionId);
    const session = await this.repository.createSession({
      id: sessionId,
      userId: user.id,
      familyId,
      tokenHash: refresh.tokenHash,
      expiresAt: this.tokenService.refreshTokenExpiresAt(),
      ...request,
    });

    return {
      user: toPublicUser(user),
      tokens: {
        accessToken: await this.tokenService.signAccessToken(user, session.id),
        refreshToken: refresh.token,
        csrfToken: this.tokenService.createCsrfToken(),
      },
    };
  }

  private async sendVerificationEmail(user: UserRecord, token: string): Promise<void> {
    const verificationUrl = `${this.configService.getOrThrow<string>('WEB_APP_URL')}/verify-email?token=${encodeURIComponent(token)}`;
    await this.sendMailSafely(() =>
      this.mailService.sendEmailVerification(
        { email: user.email, firstName: user.firstName },
        verificationUrl,
      ),
    );
  }

  private async sendMailSafely(operation: () => Promise<void>): Promise<void> {
    try {
      await operation();
    } catch (error) {
      this.logger.error('Transactional email delivery failed.', error);
    }
  }
}
