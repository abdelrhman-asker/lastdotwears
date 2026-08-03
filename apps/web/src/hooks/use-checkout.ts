'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { commerceQueryKeys } from '@/hooks/use-commerce';
import {
  getCheckoutQuote,
  getInvoice,
  getOrder,
  getShippingRates,
  listOrders,
  placeOrder,
} from '@/lib/api/checkout';
import type { OrderStatus } from '@/types/orders';

export const checkoutQueryKeys = {
  shipping: ['checkout', 'shipping-rates'] as const,
  order: (orderNumber: string) => ['orders', orderNumber] as const,
  invoice: (orderNumber: string) => ['orders', orderNumber, 'invoice'] as const,
  history: (page: number, status?: OrderStatus) =>
    ['orders', 'history', page, status ?? 'all'] as const,
};

export function useShippingRates() {
  return useQuery({
    queryKey: checkoutQueryKeys.shipping,
    queryFn: getShippingRates,
    staleTime: 5 * 60_000,
  });
}

export function useCheckoutQuote() {
  return useMutation({
    mutationFn: ({
      governorateCode,
      couponCode,
    }: {
      governorateCode: string;
      couponCode: string | null;
    }) => getCheckoutQuote(governorateCode, couponCode),
  });
}

export function usePlaceOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: placeOrder,
    onSuccess: (order) => {
      queryClient.setQueryData(checkoutQueryKeys.order(order.orderNumber), order);
      queryClient.setQueryData(commerceQueryKeys.cart, {
        id: null,
        items: [],
        itemCount: 0,
        subtotalPiasters: 0,
        hasUnavailableItems: false,
        updatedAt: null,
      });
    },
  });
}

export function useOrder(orderNumber: string) {
  return useQuery({
    queryKey: checkoutQueryKeys.order(orderNumber),
    queryFn: () => getOrder(orderNumber),
    enabled: Boolean(orderNumber),
  });
}

export function useInvoice(orderNumber: string) {
  return useQuery({
    queryKey: checkoutQueryKeys.invoice(orderNumber),
    queryFn: () => getInvoice(orderNumber),
    enabled: Boolean(orderNumber),
  });
}

export function useOrderHistory(page: number, status?: OrderStatus) {
  return useQuery({
    queryKey: checkoutQueryKeys.history(page, status),
    queryFn: () => listOrders({ page, ...(status ? { status } : {}) }),
    placeholderData: (previous) => previous,
    retry: false,
  });
}
