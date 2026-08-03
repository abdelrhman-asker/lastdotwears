export interface WishlistProductRecord {
  id: string;
  name: string;
  slug: string;
  pricePiasters: number;
  salePricePiasters: number | null;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  deletedAt: Date | null;
  brandName: string;
  image: { secureUrl: string; altText: string } | null;
  stockQuantity: number;
}

export interface WishlistItemRecord {
  id: string;
  createdAt: Date;
  product: WishlistProductRecord;
}

export interface WishlistRecord {
  id: string;
  items: WishlistItemRecord[];
  updatedAt: Date;
}
