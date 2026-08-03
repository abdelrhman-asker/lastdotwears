import { apiRequest } from '@/lib/api/http-client';
import type { Cart, Wishlist } from '@/types/commerce';

export function getCart(): Promise<Cart> {
  return apiRequest('/cart');
}

export function addCartItem(variantId: string, quantity = 1): Promise<Cart> {
  return apiRequest('/cart/items', { method: 'POST', body: { variantId, quantity } });
}

export function updateCartItem(variantId: string, quantity: number): Promise<Cart> {
  return apiRequest(`/cart/items/${variantId}`, { method: 'PATCH', body: { quantity } });
}

export function removeCartItem(variantId: string): Promise<Cart> {
  return apiRequest(`/cart/items/${variantId}`, { method: 'DELETE' });
}

export function clearCart(): Promise<Cart> {
  return apiRequest('/cart/items', { method: 'DELETE' });
}

export function getWishlist(): Promise<Wishlist> {
  return apiRequest('/wishlist');
}

export function addWishlistItem(productId: string): Promise<Wishlist> {
  return apiRequest('/wishlist/items', { method: 'POST', body: { productId } });
}

export function removeWishlistItem(productId: string): Promise<Wishlist> {
  return apiRequest(`/wishlist/items/${productId}`, { method: 'DELETE' });
}
