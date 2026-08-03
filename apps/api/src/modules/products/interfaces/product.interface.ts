export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

export interface ProductVariantRecord {
  id: string;
  productId: string;
  sku: string;
  size: string;
  colorName: string;
  colorHex: string | null;
  priceOverridePiasters: number | null;
  stockQuantity: number;
  lowStockThreshold: number;
  isActive: boolean;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductImageRecord {
  id: string;
  productId: string;
  publicId: string;
  secureUrl: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  altText: string;
  position: number;
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductRecord {
  id: string;
  name: string;
  slug: string;
  description: string;
  pricePiasters: number;
  salePricePiasters: number | null;
  categoryId: string;
  brandId: string;
  status: ProductStatus;
  isFeatured: boolean;
  isNewArrival: boolean;
  createdAt: Date;
  updatedAt: Date;
  category: { id: string; name: string; slug: string };
  brand: { id: string; name: string; slug: string };
  variants: ProductVariantRecord[];
  images: ProductImageRecord[];
}

export interface ProductListQuery {
  page: number;
  limit: number;
  search?: string;
  category?: string;
  brand?: string;
  size?: string;
  color?: string;
  featured?: boolean;
  newArrival?: boolean;
  minPrice?: number;
  maxPrice?: number;
  status?: ProductStatus;
  sort: 'newest' | 'oldest' | 'price-asc' | 'price-desc' | 'name-asc';
}
