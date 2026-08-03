import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Roles } from '../../../common/decorators/roles.decorator.js';
import { DashboardQueryDto, DashboardResponseDto } from '../dto/dashboard.dto.js';
import { AnalyticsService } from '../services/analytics.service.js';

@ApiTags('Admin Analytics')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin/analytics')
export class AdminAnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get revenue, order, customer, and best-seller dashboard metrics' })
  @ApiOkResponse({ type: DashboardResponseDto })
  dashboard(@Query() query: DashboardQueryDto): Promise<DashboardResponseDto> {
    return this.service.dashboard(query.days);
  }
}
