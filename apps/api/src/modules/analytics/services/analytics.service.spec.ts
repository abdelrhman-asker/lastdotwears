import type { AnalyticsRepository } from '../interfaces/analytics-repository.interface.js';
import { AnalyticsService } from './analytics.service.js';

describe('AnalyticsService', () => {
  it('creates an exact UTC reporting window and maps the dashboard read model', async () => {
    let receivedSince: Date | null = null;
    const record = {
      revenuePiasters: 250_000,
      ordersInPeriod: 3,
      customersTotal: 10,
      newCustomersInPeriod: 2,
      statusCounts: { DELIVERED: 2 },
      bestSellers: [],
      recentOrders: [],
    };
    const repository = {
      dashboard: (since: Date) => {
        receivedSince = since;
        return Promise.resolve(record);
      },
    } as AnalyticsRepository;
    const service = new AnalyticsService(repository);
    const now = new Date('2026-08-03T12:00:00.000Z');

    await expect(service.dashboard(30, now)).resolves.toMatchObject({
      ...record,
      periodDays: 30,
      since: new Date('2026-07-04T12:00:00.000Z'),
    });
    expect(receivedSince).toEqual(new Date('2026-07-04T12:00:00.000Z'));
  });
});
