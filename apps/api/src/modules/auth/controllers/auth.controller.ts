import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';

import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Public } from '../../../common/decorators/public.decorator.js';
import { SkipCsrf } from '../../../common/decorators/skip-csrf.decorator.js';
import { UserResponseDto } from '../../users/dto/user.dto.js';
import type { AuthenticatedUser } from '../interfaces/authenticated-user.interface.js';
import {
  EmailRequestDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  TokenRequestDto,
} from '../dto/auth.dto.js';
import {
  AuthenticationResponseDto,
  CsrfTokenResponseDto,
  MessageResponseDto,
} from '../dto/auth-response.dto.js';
import { AuthCookieService, REFRESH_TOKEN_COOKIE } from '../services/auth-cookie.service.js';
import { AuthService } from '../services/auth.service.js';
import { AuthTokenService } from '../services/auth-token.service.js';
import { readCookie, requestMetadata } from '../utils/request.util.js';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cookieService: AuthCookieService,
    private readonly tokenService: AuthTokenService,
  ) {}

  @Get('csrf')
  @Public()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Issue a browser CSRF token' })
  @ApiOkResponse({ type: CsrfTokenResponseDto })
  issueCsrfToken(@Res({ passthrough: true }) response: Response): CsrfTokenResponseDto {
    const csrfToken = this.tokenService.createCsrfToken();
    this.cookieService.setCsrfCookie(response, csrfToken);
    return { csrfToken };
  }

  @Post('register')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Register a customer account' })
  @ApiOkResponse({ type: AuthenticationResponseDto })
  async register(
    @Body() input: RegisterDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthenticationResponseDto> {
    const result = await this.authService.register(input, requestMetadata(request));
    this.cookieService.setSessionCookies(response, result.tokens);
    return { user: UserResponseDto.from(result.user) };
  }

  @Post('login')
  @HttpCode(200)
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Authenticate a customer' })
  @ApiOkResponse({ type: AuthenticationResponseDto })
  async login(
    @Body() input: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthenticationResponseDto> {
    const result = await this.authService.login(input, requestMetadata(request));
    this.cookieService.setSessionCookies(response, result.tokens);
    return { user: UserResponseDto.from(result.user) };
  }

  @Post('refresh')
  @HttpCode(200)
  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Rotate a refresh session and issue a new access token' })
  @ApiOkResponse({ type: AuthenticationResponseDto })
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthenticationResponseDto> {
    const refreshToken = readCookie(request, REFRESH_TOKEN_COOKIE);
    if (!refreshToken) {
      throw new UnauthorizedException('The session is invalid or expired.');
    }
    const result = await this.authService.refresh(refreshToken, requestMetadata(request));
    this.cookieService.setSessionCookies(response, result.tokens);
    return { user: UserResponseDto.from(result.user) };
  }

  @Post('logout')
  @HttpCode(200)
  @Public()
  @ApiOperation({ summary: 'Revoke the current refresh session' })
  @ApiOkResponse({ type: MessageResponseDto })
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<MessageResponseDto> {
    await this.authService.logout(readCookie(request, REFRESH_TOKEN_COOKIE));
    this.cookieService.clearSessionCookies(response);
    return { message: 'You have been signed out.' };
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the authenticated user' })
  @ApiOkResponse({ type: UserResponseDto })
  async me(@CurrentUser() user: AuthenticatedUser): Promise<UserResponseDto> {
    return UserResponseDto.from(await this.authService.currentUser(user.id));
  }

  @Post('verify-email')
  @HttpCode(200)
  @Public()
  @SkipCsrf()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Consume a one-time email verification token' })
  @ApiOkResponse({ type: UserResponseDto })
  async verifyEmail(@Body() input: TokenRequestDto): Promise<UserResponseDto> {
    return UserResponseDto.from(await this.authService.verifyEmail(input.token));
  }

  @Post('resend-verification')
  @HttpCode(202)
  @Public()
  @SkipCsrf()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @ApiOperation({ summary: 'Request another email verification link' })
  @ApiOkResponse({ type: MessageResponseDto })
  async resendVerification(@Body() input: EmailRequestDto): Promise<MessageResponseDto> {
    await this.authService.resendVerification(input);
    return { message: 'If verification is available, a new email has been sent.' };
  }

  @Post('forgot-password')
  @HttpCode(202)
  @Public()
  @SkipCsrf()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @ApiOperation({ summary: 'Request a password reset link' })
  @ApiOkResponse({ type: MessageResponseDto })
  async forgotPassword(@Body() input: EmailRequestDto): Promise<MessageResponseDto> {
    await this.authService.forgotPassword(input);
    return { message: 'If the account exists, a password reset email has been sent.' };
  }

  @Post('reset-password')
  @HttpCode(200)
  @Public()
  @SkipCsrf()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Reset a password using a one-time token' })
  @ApiOkResponse({ type: MessageResponseDto })
  async resetPassword(@Body() input: ResetPasswordDto): Promise<MessageResponseDto> {
    await this.authService.resetPassword(input);
    return { message: 'Your password has been reset. Sign in with the new password.' };
  }
}
