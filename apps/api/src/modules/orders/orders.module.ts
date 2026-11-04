import { Module } from '@nestjs/common';

import { PaymentsModule } from '../payments/payments.module.js';
import { MailModule } from '../mail/mail.module.js';
import { UploadsModule } from '../uploads/uploads.module.js';
import { AdminOrdersController } from './controllers/admin-orders.controller.js';
import { OrdersController } from './controllers/orders.controller.js';
import { ORDERS_REPOSITORY } from './interfaces/orders-repository.interface.js';
import { PrismaOrdersRepository } from './repositories/prisma-orders.repository.js';
import { OrdersService } from './services/orders.service.js';

@Module({
  imports: [PaymentsModule, MailModule, UploadsModule],
  controllers: [OrdersController, AdminOrdersController],
  providers: [
    PrismaOrdersRepository,
    { provide: ORDERS_REPOSITORY, useExisting: PrismaOrdersRepository },
    OrdersService,
  ],
  exports: [OrdersService],
})
export class OrdersModule {}
