import { Module } from '@nestjs/common';

import { CartModule } from '../cart/cart.module.js';
import { OrdersModule } from '../orders/orders.module.js';
import { ShopperModule } from '../shopper/shopper.module.js';
import { SettingsModule } from '../settings/settings.module.js';
import { MailModule } from '../mail/mail.module.js';
import { CheckoutController } from './controllers/checkout.controller.js';
import { CHECKOUT_REPOSITORY } from './interfaces/checkout-repository.interface.js';
import { PrismaCheckoutRepository } from './repositories/prisma-checkout.repository.js';
import { CheckoutService } from './services/checkout.service.js';

@Module({
  imports: [CartModule, OrdersModule, ShopperModule, SettingsModule, MailModule],
  controllers: [CheckoutController],
  providers: [
    PrismaCheckoutRepository,
    { provide: CHECKOUT_REPOSITORY, useExisting: PrismaCheckoutRepository },
    CheckoutService,
  ],
})
export class CheckoutModule {}
