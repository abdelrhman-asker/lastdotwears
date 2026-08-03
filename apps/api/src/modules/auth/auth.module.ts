import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';

import { MailModule } from '../mail/mail.module.js';
import { AdminAuthController } from './controllers/admin-auth.controller.js';
import { AuthController } from './controllers/auth.controller.js';
import { CsrfGuard } from './guards/csrf.guard.js';
import { JwtAuthenticationGuard } from './guards/jwt-authentication.guard.js';
import { RolesGuard } from './guards/roles.guard.js';
import { AUTH_REPOSITORY } from './interfaces/auth-repository.interface.js';
import { PrismaAuthRepository } from './repositories/prisma-auth.repository.js';
import { AuthCookieService } from './services/auth-cookie.service.js';
import { AuthTokenService } from './services/auth-token.service.js';
import { AuthService } from './services/auth.service.js';
import { PasswordService } from './services/password.service.js';

@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      }),
    }),
    MailModule,
  ],
  controllers: [AuthController, AdminAuthController],
  providers: [
    PrismaAuthRepository,
    {
      provide: AUTH_REPOSITORY,
      useExisting: PrismaAuthRepository,
    },
    PasswordService,
    AuthTokenService,
    AuthCookieService,
    AuthService,
    CsrfGuard,
    JwtAuthenticationGuard,
    RolesGuard,
    {
      provide: APP_GUARD,
      useExisting: CsrfGuard,
    },
    {
      provide: APP_GUARD,
      useExisting: JwtAuthenticationGuard,
    },
    {
      provide: APP_GUARD,
      useExisting: RolesGuard,
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
