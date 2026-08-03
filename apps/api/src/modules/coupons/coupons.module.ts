import { Module } from '@nestjs/common';

import { AdminCouponsController } from './controllers/admin-coupons.controller.js';
import { COUPONS_REPOSITORY } from './interfaces/coupons-repository.interface.js';
import { PrismaCouponsRepository } from './repositories/prisma-coupons.repository.js';
import { CouponsService } from './services/coupons.service.js';

@Module({
  controllers: [AdminCouponsController],
  providers: [
    PrismaCouponsRepository,
    { provide: COUPONS_REPOSITORY, useExisting: PrismaCouponsRepository },
    CouponsService,
  ],
  exports: [CouponsService],
})
export class CouponsModule {}
