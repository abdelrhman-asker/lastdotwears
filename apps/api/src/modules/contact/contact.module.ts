import { Module } from '@nestjs/common';

import { MailModule } from '../mail/mail.module.js';
import { SettingsModule } from '../settings/settings.module.js';
import { AdminContactController } from './controllers/admin-contact.controller.js';
import { ContactController } from './controllers/contact.controller.js';
import { CONTACT_REPOSITORY } from './interfaces/contact-repository.interface.js';
import { PrismaContactRepository } from './repositories/prisma-contact.repository.js';
import { ContactService } from './services/contact.service.js';

@Module({
  imports: [MailModule, SettingsModule],
  controllers: [ContactController, AdminContactController],
  providers: [
    PrismaContactRepository,
    { provide: CONTACT_REPOSITORY, useExisting: PrismaContactRepository },
    ContactService,
  ],
})
export class ContactModule {}
