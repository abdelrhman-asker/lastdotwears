import { ConfigService } from '@nestjs/config';
import QRCode from 'qrcode';

import type { SettingsRepository } from '../../settings/interfaces/settings-repository.interface.js';
import type { WebsiteSettingsRecord } from '../../settings/interfaces/settings.interface.js';
import { SettingsService } from '../../settings/services/settings.service.js';
import type { ImageStorage } from '../../uploads/interfaces/image-storage.interface.js';
import { InstaPayService } from './instapay.service.js';

const paymentUrl = 'https://ipn.eg/S/Fixture/instapay/AbC%2F09?token=a%2Bb';
const paymentId = 'fixture@instapay';
const savedPaymentId = 'saved-fixture@instapay';
const fixturePng = 'data:image/png;base64,fixture';
const originalEncoder = QRCode.toDataURL;
const encodedValues: string[] = [];

beforeEach(() => {
  encodedValues.length = 0;
  QRCode.toDataURL = ((value: string) => {
    encodedValues.push(value);
    return Promise.resolve(fixturePng);
  }) as typeof originalEncoder;
});

afterEach(() => {
  QRCode.toDataURL = originalEncoder;
});

function service(savedQrValue: string | null, runtimeQrValue?: string) {
  const saved = {
    instaPayId: savedPaymentId,
    instaPayQrValue: savedQrValue,
    instaPayEnabled: true,
    instaPayInstructions: 'Use the order number as the transfer reference.',
  } as WebsiteSettingsRecord;
  const repository = {
    getSettings: () => Promise.resolve(saved),
  } as SettingsRepository;
  const config = new ConfigService({
    INSTAPAY_ID: paymentId,
    INSTAPAY_QR_VALUE: runtimeQrValue ?? '',
  });
  return new InstaPayService(new SettingsService(repository, {} as ImageStorage, config));
}

describe('InstaPay checkout instructions', () => {
  it.each([null, savedPaymentId, 'https://ipn.eg/S/stale-link'])(
    'encodes the exact runtime URL with persisted QR value %s',
    async (savedValue) => {
      const result = await service(savedValue, paymentUrl).instructions('LDW-FIXTURE', 12_300);
      expect(result).toMatchObject({
        instaPayId: paymentId,
        paymentUrl,
        amountPiasters: 12_300,
        orderNumber: 'LDW-FIXTURE',
        instructions: 'Use the order number as the transfer reference.',
      });
      expect(result.qrCodeDataUrl).toBe(fixturePng);
      expect(encodedValues).toEqual([paymentUrl]);
    },
  );

  it('uses the approved saved link and saved ID when there is no runtime link', async () => {
    const result = await service(paymentUrl).instructions('LDW-FIXTURE', 12_300);
    expect(result).toMatchObject({ paymentUrl, instaPayId: savedPaymentId });
    expect(result.qrCodeDataUrl).toBe(fixturePng);
    expect(encodedValues).toEqual([paymentUrl]);
  });

  it.each([null, savedPaymentId, 'http://ipn.eg/S/insecure', 'https://ipn.eg.example/unsafe'])(
    'keeps manual transfer available without a valid payment link (%s)',
    async (savedValue) => {
      await expect(service(savedValue).instructions('LDW-FIXTURE', 12_300)).resolves.toMatchObject({
        instaPayId: savedPaymentId,
        paymentUrl: null,
        qrCodeDataUrl: null,
      });
      expect(encodedValues).toEqual([]);
    },
  );
});
