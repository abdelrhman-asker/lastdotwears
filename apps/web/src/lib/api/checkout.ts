import { apiBlobRequest, apiRequest } from '@/lib/api/http-client';
import type { CheckoutFormInput } from '@/lib/validation/checkout';
import type {
  CheckoutQuote,
  Order,
  OrderStatus,
  PaginatedOrders,
  ShippingRate,
} from '@/types/orders';

export function getShippingRates(): Promise<ShippingRate[]> {
  return apiRequest('/shipping/rates');
}

export function getCheckoutQuote(
  governorateCode: string,
  couponCode: string | null,
): Promise<CheckoutQuote> {
  return apiRequest('/checkout/quote', {
    method: 'POST',
    body: { governorateCode, ...(couponCode ? { couponCode } : {}) },
  });
}

export function placeOrder(
  input: CheckoutFormInput & { couponCode: string | null; idempotencyKey: string },
): Promise<Order> {
  return apiRequest('/checkout/orders', {
    method: 'POST',
    body: {
      ...input,
      ...(input.couponCode ? { couponCode: input.couponCode } : {}),
      shippingAddressLine2: input.shippingAddressLine2 || null,
      shippingPostalCode: input.shippingPostalCode || null,
      deliveryNotes: input.deliveryNotes || null,
    },
  });
}

export function getOrder(orderNumber: string): Promise<Order> {
  return apiRequest(`/checkout/orders/${encodeURIComponent(orderNumber)}`);
}

export function submitInstaPayProof(orderNumber: string, file: File): Promise<Order> {
  const body = new FormData();
  body.append('file', file);
  return apiRequest(`/checkout/orders/${encodeURIComponent(orderNumber)}/payment-proof`, {
    method: 'POST',
    body,
  });
}

export function getInstaPayProof(orderNumber: string): Promise<Blob> {
  return apiBlobRequest(`/checkout/orders/${encodeURIComponent(orderNumber)}/payment-proof`);
}

export function getInvoice(orderNumber: string): Promise<Order> {
  return apiRequest(`/checkout/orders/${encodeURIComponent(orderNumber)}/invoice`);
}

export function listOrders(input: {
  page: number;
  limit?: number;
  status?: OrderStatus;
}): Promise<PaginatedOrders> {
  const query = new URLSearchParams({
    page: String(input.page),
    limit: String(input.limit ?? 12),
  });
  if (input.status) query.set('status', input.status);
  return apiRequest(`/orders?${query.toString()}`);
}
