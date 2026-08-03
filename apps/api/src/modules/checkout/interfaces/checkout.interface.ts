import type { OrderRecord, PaymentMethod } from '../../orders/interfaces/order.interface.js';

export interface CheckoutQuoteRecord {
  subtotalPiasters: number;
  discountPiasters: number;
  shippingPiasters: number;
  totalPiasters: number;
  couponCode: string | null;
  shipping: {
    governorateCode: string;
    governorateName: string;
    estimatedMinDays: number;
    estimatedMaxDays: number;
  };
}

export interface PlaceOrderInput {
  idempotencyKey: string;
  couponCode: string | null;
  governorateCode: string;
  paymentMethod: PaymentMethod;
  customerFirstName: string;
  customerLastName: string;
  customerEmail: string;
  customerPhone: string;
  shippingCity: string;
  shippingAddressLine1: string;
  shippingAddressLine2: string | null;
  shippingPostalCode: string | null;
  deliveryNotes: string | null;
}

export type CheckoutFailure =
  | { kind: 'empty_cart' }
  | { kind: 'cart_changed'; detail: string }
  | { kind: 'shipping_unavailable' }
  | { kind: 'coupon_invalid'; detail: string }
  | { kind: 'conflict' };

export type CheckoutQuoteResult = { kind: 'ok'; quote: CheckoutQuoteRecord } | CheckoutFailure;
export type PlaceOrderResult =
  { kind: 'ok'; order: OrderRecord; idempotentReplay: boolean } | CheckoutFailure;
