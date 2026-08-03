import { Body, Controller, HttpCode, Post, Req, Res } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';

import { Public } from '../../../common/decorators/public.decorator.js';
import { UserResponseDto } from '../../users/dto/user.dto.js';
import { AuthenticationResponseDto } from '../dto/auth-response.dto.js';
import { LoginDto } from '../dto/auth.dto.js';
import { AuthCookieService } from '../services/auth-cookie.service.js';
import { AuthService } from '../services/auth.service.js';
import { requestMetadata } from '../utils/request.util.js';

@ApiTags('Admin Authentication')
@Controller('admin/auth')
export class AdminAuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cookieService: AuthCookieService,
  ) {}

  @Post('login')
  @HttpCode(200)
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Authenticate a verified administrator' })
  @ApiOkResponse({ type: AuthenticationResponseDto })
  async login(
    @Body() input: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthenticationResponseDto> {
    const result = await this.authService.login(input, requestMetadata(request), 'ADMIN');
    this.cookieService.setSessionCookies(response, result.tokens);
    return { user: UserResponseDto.from(result.user) };
  }
}
