import { Module } from '@nestjs/common';

import { UploadsModule } from '../uploads/uploads.module.js';
import { AdminProductsController } from './controllers/admin-products.controller.js';
import { ProductsController } from './controllers/products.controller.js';
import { PRODUCTS_REPOSITORY } from './interfaces/products-repository.interface.js';
import { PrismaProductsRepository } from './repositories/prisma-products.repository.js';
import { ProductsService } from './services/products.service.js';

@Module({
  imports: [UploadsModule],
  controllers: [ProductsController, AdminProductsController],
  providers: [
    PrismaProductsRepository,
    { provide: PRODUCTS_REPOSITORY, useExisting: PrismaProductsRepository },
    ProductsService,
  ],
  exports: [ProductsService],
})
export class ProductsModule {}
