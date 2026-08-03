import { Module } from '@nestjs/common';

import { ShopperModule } from '../shopper/shopper.module.js';
import { WishlistController } from './controllers/wishlist.controller.js';
import { WISHLIST_REPOSITORY } from './interfaces/wishlist-repository.interface.js';
import { PrismaWishlistRepository } from './repositories/prisma-wishlist.repository.js';
import { WishlistService } from './services/wishlist.service.js';

@Module({
  imports: [ShopperModule],
  controllers: [WishlistController],
  providers: [
    PrismaWishlistRepository,
    { provide: WISHLIST_REPOSITORY, useExisting: PrismaWishlistRepository },
    WishlistService,
  ],
  exports: [WishlistService],
})
export class WishlistModule {}
