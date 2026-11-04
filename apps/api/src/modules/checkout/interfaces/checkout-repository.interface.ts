import type {
  CheckoutQuoteResult,
  PlaceOrderInput,
  PlaceOrderResult,
} from './checkout.interface.js';
import type { ShopperOwner } from '../../shopper/interfaces/shopper-owner.interface.js';

export const CHECKOUT_REPOSITORY = Symbol('CHECKOUT_REPOSITORY');

export interface CheckoutRepository {
  quote(
    owner: ShopperOwner,
    governorateCode: string,
    couponCode: string | null,
  ): Promise<CheckoutQuoteResult>;
  place(owner: ShopperOwner, input: PlaceOrderInput): Promise<PlaceOrderResult>;
}
