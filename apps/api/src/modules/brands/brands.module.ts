import { Module } from '@nestjs/common';

import { AdminBrandsController } from './controllers/admin-brands.controller.js';
import { BrandsController } from './controllers/brands.controller.js';
import { BRANDS_REPOSITORY } from './interfaces/brands-repository.interface.js';
import { PrismaBrandsRepository } from './repositories/prisma-brands.repository.js';
import { BrandsService } from './services/brands.service.js';

@Module({
  controllers: [BrandsController, AdminBrandsController],
  providers: [
    PrismaBrandsRepository,
    { provide: BRANDS_REPOSITORY, useExisting: PrismaBrandsRepository },
    BrandsService,
  ],
  exports: [BrandsService],
})
export class BrandsModule {}
