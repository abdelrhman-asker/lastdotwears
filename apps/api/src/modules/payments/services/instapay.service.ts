import { Injectable } from '@nestjs/common';
import QRCode from 'qrcode';

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
    const instaPayId = settings.instaPayId;
    const qrValue = settings.instaPayQrValue || instaPayId;
    const qrCodeDataUrl = await QRCode.toDataURL(qrValue, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 320,
      color: { dark: '#111111', light: '#ffffff' },
    });
    return {
      instaPayId,
      qrCodeDataUrl,
      instructions: settings.instaPayInstructions,
      amountPiasters,
      orderNumber,
    };
  }
}
