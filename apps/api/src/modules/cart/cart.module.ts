import { Module } from '@nestjs/common';

import { ShopperModule } from '../shopper/shopper.module.js';
import { CartController } from './controllers/cart.controller.js';
import { CART_REPOSITORY } from './interfaces/cart-repository.interface.js';
import { PrismaCartRepository } from './repositories/prisma-cart.repository.js';
import { CartService } from './services/cart.service.js';

@Module({
  imports: [ShopperModule],
  controllers: [CartController],
  providers: [
    PrismaCartRepository,
    { provide: CART_REPOSITORY, useExisting: PrismaCartRepository },
    CartService,
  ],
  exports: [CartService],
})
export class CartModule {}
