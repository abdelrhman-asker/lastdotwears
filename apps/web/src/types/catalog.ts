export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  position: number;
  isActive: boolean;
  productCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  websiteUrl: string | null;
  isActive: boolean;
  productCount: number;
  createdAt: string;
  updatedAt: string;
}

export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

export interface ProductVariant {
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
  createdAt: string;
  updatedAt: string;
}

export interface ProductImage {
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
  createdAt: string;
  updatedAt: string;
}

export interface Product {
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
  category: Pick<Category, 'id' | 'name' | 'slug'>;
  brand: Pick<Brand, 'id' | 'name' | 'slug'>;
  variants: ProductVariant[];
  images: ProductImage[];
  availableSizes: string[];
  availableColors: string[];
  stockQuantity: number;
  createdAt: string;
  updatedAt: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface InventoryItem {
  variantId: string;
  productId: string;
  productName: string;
  productSlug: string;
  sku: string;
  size: string;
  colorName: string;
  stockQuantity: number;
  lowStockThreshold: number;
  isActive: boolean;
  updatedAt: string;
}
