import { Module } from '@nestjs/common';

import { UploadsModule } from '../uploads/uploads.module.js';
import { AdminSettingsController } from './controllers/admin-settings.controller.js';
import { SettingsController } from './controllers/settings.controller.js';
import { SETTINGS_REPOSITORY } from './interfaces/settings-repository.interface.js';
import { PrismaSettingsRepository } from './repositories/prisma-settings.repository.js';
import { SettingsService } from './services/settings.service.js';

@Module({
  imports: [UploadsModule],
  controllers: [SettingsController, AdminSettingsController],
  providers: [
    PrismaSettingsRepository,
    { provide: SETTINGS_REPOSITORY, useExisting: PrismaSettingsRepository },
    SettingsService,
  ],
  exports: [SettingsService],
})
export class SettingsModule {}
