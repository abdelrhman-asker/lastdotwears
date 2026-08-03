import { Module } from '@nestjs/common';

import { MAIL_SERVICE } from './interfaces/mail-service.interface.js';
import { TransactionalMailService } from './services/transactional-mail.service.js';

@Module({
  providers: [
    TransactionalMailService,
    {
      provide: MAIL_SERVICE,
      useExisting: TransactionalMailService,
    },
  ],
  exports: [MAIL_SERVICE],
})
export class MailModule {}
