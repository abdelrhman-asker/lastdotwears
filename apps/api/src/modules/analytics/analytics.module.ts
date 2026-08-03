import { Module } from '@nestjs/common';

import { AdminAnalyticsController } from './controllers/admin-analytics.controller.js';
import { ANALYTICS_REPOSITORY } from './interfaces/analytics-repository.interface.js';
import { PrismaAnalyticsRepository } from './repositories/prisma-analytics.repository.js';
import { AnalyticsService } from './services/analytics.service.js';

@Module({
  controllers: [AdminAnalyticsController],
  providers: [
    PrismaAnalyticsRepository,
    { provide: ANALYTICS_REPOSITORY, useExisting: PrismaAnalyticsRepository },
    AnalyticsService,
  ],
})
export class AnalyticsModule {}
