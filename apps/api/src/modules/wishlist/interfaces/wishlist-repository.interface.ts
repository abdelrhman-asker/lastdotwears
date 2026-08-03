import type { ShopperOwner } from '../../shopper/interfaces/shopper-owner.interface.js';
import type { WishlistProductRecord, WishlistRecord } from './wishlist.interface.js';

export const WISHLIST_REPOSITORY = Symbol('WISHLIST_REPOSITORY');

export interface WishlistRepository {
  findByOwner(owner: ShopperOwner): Promise<WishlistRecord | null>;
  findProduct(productId: string): Promise<WishlistProductRecord | null>;
  addItem(owner: ShopperOwner, productId: string): Promise<WishlistRecord>;
  removeItem(owner: ShopperOwner, productId: string): Promise<WishlistRecord | null>;
  mergeGuestIntoUser(userId: string, guestTokenHash: string): Promise<void>;
}
