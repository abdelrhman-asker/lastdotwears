import type { ShopperOwner } from '../../shopper/interfaces/shopper-owner.interface.js';
import type { CartRecord, CartVariantRecord } from './cart.interface.js';

export const CART_REPOSITORY = Symbol('CART_REPOSITORY');

export interface CartRepository {
  findByOwner(owner: ShopperOwner): Promise<CartRecord | null>;
  findVariant(variantId: string): Promise<CartVariantRecord | null>;
  setItem(owner: ShopperOwner, variantId: string, quantity: number): Promise<CartRecord>;
  removeItem(owner: ShopperOwner, variantId: string): Promise<CartRecord | null>;
  clear(owner: ShopperOwner): Promise<CartRecord | null>;
  mergeGuestIntoUser(userId: string, guestTokenHash: string): Promise<void>;
}
