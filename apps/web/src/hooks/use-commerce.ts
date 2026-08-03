'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  addCartItem,
  addWishlistItem,
  clearCart,
  getCart,
  getWishlist,
  removeCartItem,
  removeWishlistItem,
  updateCartItem,
} from '@/lib/api/commerce';
import type { Cart, Wishlist } from '@/types/commerce';

export const commerceQueryKeys = {
  cart: ['commerce', 'cart'] as const,
  wishlist: ['commerce', 'wishlist'] as const,
};

export function useCart() {
  return useQuery({ queryKey: commerceQueryKeys.cart, queryFn: getCart, staleTime: 30_000 });
}

export function useWishlist() {
  return useQuery({
    queryKey: commerceQueryKeys.wishlist,
    queryFn: getWishlist,
    staleTime: 30_000,
  });
}

export function useAddCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ variantId, quantity }: { variantId: string; quantity: number }) =>
      addCartItem(variantId, quantity),
    onSuccess: (cart) => queryClient.setQueryData<Cart>(commerceQueryKeys.cart, cart),
  });
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ variantId, quantity }: { variantId: string; quantity: number }) =>
      updateCartItem(variantId, quantity),
    onSuccess: (cart) => queryClient.setQueryData<Cart>(commerceQueryKeys.cart, cart),
  });
}

export function useRemoveCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: removeCartItem,
    onSuccess: (cart) => queryClient.setQueryData<Cart>(commerceQueryKeys.cart, cart),
  });
}

export function useClearCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clearCart,
    onSuccess: (cart) => queryClient.setQueryData<Cart>(commerceQueryKeys.cart, cart),
  });
}

export function useToggleWishlist() {
  const queryClient = useQueryClient();
  const wishlist = useWishlist();
  const mutation = useMutation({
    mutationFn: ({ productId, saved }: { productId: string; saved: boolean }) =>
      saved ? removeWishlistItem(productId) : addWishlistItem(productId),
    onSuccess: (result) => queryClient.setQueryData<Wishlist>(commerceQueryKeys.wishlist, result),
  });
  return {
    ...mutation,
    wishlist,
    isSaved: (productId: string) =>
      wishlist.data?.items.some((item) => item.product.id === productId) ?? false,
  };
}
