import type {
  CheckoutQuoteResult,
  PlaceOrderInput,
  PlaceOrderResult,
} from './checkout.interface.js';

export const CHECKOUT_REPOSITORY = Symbol('CHECKOUT_REPOSITORY');

export interface CheckoutRepository {
  quote(
    userId: string,
    governorateCode: string,
    couponCode: string | null,
  ): Promise<CheckoutQuoteResult>;
  place(userId: string, input: PlaceOrderInput): Promise<PlaceOrderResult>;
}
