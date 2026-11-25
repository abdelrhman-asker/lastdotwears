import { Injectable } from '@nestjs/common';
import QRCode from 'qrcode';
import { isInstaPayPaymentUrl } from '../../../common/utils/instapay-url.util.js';

import type { InstaPayInstructionsDto } from '../dto/instapay.dto.js';
import { SettingsService } from '../../settings/services/settings.service.js';

@Injectable()
export class InstaPayService {
  constructor(private readonly settings: SettingsService) {}

  async instructions(
    orderNumber: string,
    amountPiasters: number,
  ): Promise<InstaPayInstructionsDto> {
    const settings = await this.settings.paymentSettings();
    const configuredUrl = settings.instaPayQrValue;
    const paymentUrl = configuredUrl && isInstaPayPaymentUrl(configuredUrl) ? configuredUrl : null;
    const qrCodeDataUrl = paymentUrl
      ? await QRCode.toDataURL(paymentUrl, {
          errorCorrectionLevel: 'M',
          margin: 2,
          width: 320,
          color: { dark: '#111111', light: '#ffffff' },
        })
      : null;
    return {
      instaPayId: settings.instaPayId,
      paymentUrl,
      qrCodeDataUrl,
      instructions: settings.instaPayInstructions,
      amountPiasters,
      orderNumber,
    };
  }
}
