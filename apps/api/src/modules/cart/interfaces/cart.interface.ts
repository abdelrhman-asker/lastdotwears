export type CartItemIssue = 'UNAVAILABLE' | 'OUT_OF_STOCK' | 'INSUFFICIENT_STOCK';

export interface CartProductRecord {
  id: string;
  name: string;
  slug: string;
  pricePiasters: number;
  salePricePiasters: number | null;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  deletedAt: Date | null;
  brandName: string;
  image: { secureUrl: string; altText: string } | null;
}

export interface CartVariantRecord {
  id: string;
  productId: string;
  sku: string;
  size: string;
  colorName: string;
  colorHex: string | null;
  priceOverridePiasters: number | null;
  stockQuantity: number;
  isActive: boolean;
  deletedAt: Date | null;
  product: CartProductRecord;
}

export interface CartItemRecord {
  id: string;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
  variant: CartVariantRecord;
}

export interface CartRecord {
  id: string;
  items: CartItemRecord[];
  updatedAt: Date;
}
