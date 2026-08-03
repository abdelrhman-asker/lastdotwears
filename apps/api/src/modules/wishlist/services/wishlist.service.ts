import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import type { ShopperOwner } from '../../shopper/interfaces/shopper-owner.interface.js';
import { AddWishlistItemDto, WishlistResponseDto } from '../dto/wishlist.dto.js';
import {
  WISHLIST_REPOSITORY,
  type WishlistRepository,
} from '../interfaces/wishlist-repository.interface.js';
import type { WishlistRecord } from '../interfaces/wishlist.interface.js';

@Injectable()
export class WishlistService {
  constructor(@Inject(WISHLIST_REPOSITORY) private readonly repository: WishlistRepository) {}

  async get(owner: ShopperOwner): Promise<WishlistResponseDto> {
    const prepared = await this.prepareOwner(owner);
    const wishlist = await this.repository.findByOwner(prepared);
    return wishlist ? this.toResponse(wishlist) : WishlistResponseDto.empty();
  }

  async add(owner: ShopperOwner, input: AddWishlistItemDto): Promise<WishlistResponseDto> {
    const prepared = await this.prepareOwner(owner);
    this.assertOwner(prepared);
    const product = await this.repository.findProduct(input.productId);
    if (!product || product.deletedAt || product.status !== 'ACTIVE') {
      throw new NotFoundException('Product is not available.');
    }
    return this.toResponse(await this.repository.addItem(prepared, input.productId));
  }

  async remove(owner: ShopperOwner, productId: string): Promise<WishlistResponseDto> {
    const prepared = await this.prepareOwner(owner);
    const wishlist = await this.repository.removeItem(prepared, productId);
    return wishlist ? this.toResponse(wishlist) : WishlistResponseDto.empty();
  }

  private async prepareOwner(owner: ShopperOwner): Promise<ShopperOwner> {
    if (owner.userId && owner.guestTokenHash) {
      await this.repository.mergeGuestIntoUser(owner.userId, owner.guestTokenHash);
      return { userId: owner.userId };
    }
    return owner;
  }

  private toResponse(wishlist: WishlistRecord): WishlistResponseDto {
    return {
      id: wishlist.id,
      itemCount: wishlist.items.length,
      updatedAt: wishlist.updatedAt,
      items: wishlist.items.map((item) => ({
        id: item.id,
        createdAt: item.createdAt,
        product: {
          id: item.product.id,
          name: item.product.name,
          slug: item.product.slug,
          brandName: item.product.brandName,
          pricePiasters: item.product.pricePiasters,
          salePricePiasters: item.product.salePricePiasters,
          imageUrl: item.product.image?.secureUrl ?? null,
          imageAlt: item.product.image?.altText ?? null,
          stockQuantity: item.product.stockQuantity,
          isAvailable: !item.product.deletedAt && item.product.status === 'ACTIVE',
        },
      })),
    };
  }

  private assertOwner(owner: ShopperOwner): void {
    if (!owner.userId && (!owner.guestTokenHash || !owner.guestExpiresAt)) {
      throw new Error('A customer or guest wishlist identity is required.');
    }
  }
}
