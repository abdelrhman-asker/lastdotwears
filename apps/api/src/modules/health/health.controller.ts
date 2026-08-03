import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService, type HealthCheckResult } from '@nestjs/terminus';

import { Public } from '../../common/decorators/public.decorator.js';
import { DatabaseHealthIndicator } from './database-health.indicator.js';

interface LivenessResponse {
  status: 'ok';
  version: string;
  timestamp: string;
  uptimeSeconds: number;
}

@ApiTags('Health')
@Public()
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly database: DatabaseHealthIndicator,
    private readonly configService: ConfigService,
  ) {}

  @Get('live')
  @ApiOperation({ summary: 'Check whether the API process is alive' })
  @ApiOkResponse({ description: 'The API process is accepting requests.' })
  liveness(): LivenessResponse {
    return {
      status: 'ok',
      version: this.configService.getOrThrow<string>('APP_VERSION'),
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    };
  }

  @Get('ready')
  @HealthCheck()
  @ApiOperation({ summary: 'Check whether API dependencies are ready' })
  @ApiOkResponse({ description: 'All required dependencies are reachable.' })
  readiness(): Promise<HealthCheckResult> {
    return this.health.check([() => this.database.isHealthy('database')]);
  }
}
