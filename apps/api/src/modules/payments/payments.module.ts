import { Module } from '@nestjs/common';

import { InstaPayService } from './services/instapay.service.js';
import { SettingsModule } from '../settings/settings.module.js';

@Module({ imports: [SettingsModule], providers: [InstaPayService], exports: [InstaPayService] })
export class PaymentsModule {}
