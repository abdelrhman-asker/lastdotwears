import { Module } from '@nestjs/common';

import { AdminShippingController } from './controllers/admin-shipping.controller.js';
import { ShippingController } from './controllers/shipping.controller.js';
import { SHIPPING_REPOSITORY } from './interfaces/shipping-repository.interface.js';
import { PrismaShippingRepository } from './repositories/prisma-shipping.repository.js';
import { ShippingService } from './services/shipping.service.js';

@Module({
  controllers: [ShippingController, AdminShippingController],
  providers: [
    PrismaShippingRepository,
    { provide: SHIPPING_REPOSITORY, useExisting: PrismaShippingRepository },
    ShippingService,
  ],
  exports: [ShippingService],
})
export class ShippingModule {}
