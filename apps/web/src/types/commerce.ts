export type CartItemIssue = 'UNAVAILABLE' | 'OUT_OF_STOCK' | 'INSUFFICIENT_STOCK';

export interface CartItem {
  id: string;
  quantity: number;
  unitPricePiasters: number;
  lineTotalPiasters: number;
  maxQuantity: number;
  isAvailable: boolean;
  issue: CartItemIssue | null;
  product: {
    id: string;
    name: string;
    slug: string;
    brandName: string;
    imageUrl: string | null;
    imageAlt: string | null;
  };
  variant: {
    id: string;
    sku: string;
    size: string;
    colorName: string;
    colorHex: string | null;
  };
}

export interface Cart {
  id: string | null;
  items: CartItem[];
  itemCount: number;
  subtotalPiasters: number;
  hasUnavailableItems: boolean;
  updatedAt: string | null;
}

export interface WishlistItem {
  id: string;
  createdAt: string;
  product: {
    id: string;
    name: string;
    slug: string;
    brandName: string;
    pricePiasters: number;
    salePricePiasters: number | null;
    imageUrl: string | null;
    imageAlt: string | null;
    stockQuantity: number;
    isAvailable: boolean;
  };
}

export interface Wishlist {
  id: string | null;
  items: WishlistItem[];
  itemCount: number;
  updatedAt: string | null;
}
