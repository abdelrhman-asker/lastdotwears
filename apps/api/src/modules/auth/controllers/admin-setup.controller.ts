import { Body, Controller, Get, Headers, HttpCode, Post } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { Public } from '../../../common/decorators/public.decorator.js';
import { RequireCsrfToken } from '../../../common/decorators/skip-csrf.decorator.js';
import { AdminSetupService } from '../services/admin-setup.service.js';

@ApiExcludeController()
@Public()
@Controller('admin/setup')
export class AdminSetupController {
  constructor(private readonly setup: AdminSetupService) {}

  @Get('status')
  @HttpCode(204)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  status(): Promise<void> {
    return this.setup.assertAvailable();
  }

  @Post()
  @RequireCsrfToken()
  @HttpCode(204)
  @Throttle({ default: { limit: 3, ttl: 900_000 } })
  create(@Body() body: unknown, @Headers('origin') origin?: string): Promise<void> {
    return this.setup.create(body, origin);
  }
}
