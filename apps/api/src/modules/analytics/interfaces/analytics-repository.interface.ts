import type { DashboardRecord } from './dashboard.interface.js';

export const ANALYTICS_REPOSITORY = Symbol('ANALYTICS_REPOSITORY');

export interface AnalyticsRepository {
  dashboard(since: Date): Promise<DashboardRecord>;
}
