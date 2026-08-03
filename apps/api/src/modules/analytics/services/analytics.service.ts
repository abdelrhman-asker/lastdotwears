import { Inject, Injectable } from '@nestjs/common';

import { DashboardResponseDto, type DashboardPeriod } from '../dto/dashboard.dto.js';
import {
  ANALYTICS_REPOSITORY,
  type AnalyticsRepository,
} from '../interfaces/analytics-repository.interface.js';

@Injectable()
export class AnalyticsService {
  constructor(@Inject(ANALYTICS_REPOSITORY) private readonly repository: AnalyticsRepository) {}

  async dashboard(days: DashboardPeriod, now = new Date()): Promise<DashboardResponseDto> {
    const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1_000);
    return DashboardResponseDto.from(await this.repository.dashboard(since), days, since);
  }
}
