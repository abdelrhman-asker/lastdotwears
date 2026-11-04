import type { ConfigService } from '@nestjs/config';

import type { ImageStorage } from '../../uploads/interfaces/image-storage.interface.js';
import type { SettingsRepository } from '../interfaces/settings-repository.interface.js';
import type { WebsiteSettingsRecord } from '../interfaces/settings.interface.js';
import { SettingsService } from './settings.service.js';

const settings: WebsiteSettingsRecord = {
  id: 'store',
  storeName: 'Last-Dot Wears',
  tagline: 'Modern essentials.',
  contactEmail: 'support@last-dot.com',
  contactPhone: null,
  storeAddress: null,
  businessHours: 'Sunday-Thursday',
  announcementText: null,
  announcementEnabled: false,
  cashOnDeliveryEnabled: true,
  instaPayEnabled: true,
  instaPayId: 'store@instapay',
  instaPayQrValue: null,
  instaPayInstructions: 'Transfer the exact order total.',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

function service(repository: Partial<SettingsRepository>): SettingsService {
  return new SettingsService(
    repository as SettingsRepository,
    {} as ImageStorage,
    {
      getOrThrow: (key: string) =>
        ({
          MAIL_FROM_NAME: 'Last-Dot Wears',
          MAIL_FROM_EMAIL: 'support@last-dot.com',
          INSTAPAY_ID: 'store@instapay',
          INSTAPAY_INSTRUCTIONS: 'Transfer the exact order total.',
        })[key],
      get: () => undefined,
    } as unknown as ConfigService,
  );
}

describe('SettingsService', () => {
  it('rejects disabling every checkout payment method', async () => {
    const subject = service({ getSettings: () => Promise.resolve(settings) });
    await expect(
      subject.updateSettings({ cashOnDeliveryEnabled: false, instaPayEnabled: false }),
    ).rejects.toThrow('At least one checkout payment method');
  });

  it('returns only the public settings projection with active repository collections', async () => {
    const subject = service({
      getSettings: () => Promise.resolve(settings),
      listSocialLinks: () => Promise.resolve([]),
      listBanners: () => Promise.resolve([]),
    });
    await expect(subject.publicSettings()).resolves.toMatchObject({
      storeName: settings.storeName,
      instaPayEnabled: true,
      socialLinks: [],
      banners: [],
    });
  });

  it('validates scheduled banner windows before persistence', async () => {
    const subject = service({});
    await expect(
      subject.createBanner({
        title: 'Campaign',
        imageUrl: '/images/campaign.jpg',
        altText: 'Campaign editorial image',
        ctaLabel: 'Shop now',
        ctaUrl: '/products',
        startsAt: '2026-08-10T00:00:00.000Z',
        endsAt: '2026-08-09T00:00:00.000Z',
      }),
    ).rejects.toThrow('after its start time');
  });
});
