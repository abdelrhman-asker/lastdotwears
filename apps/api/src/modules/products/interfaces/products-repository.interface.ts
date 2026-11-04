import type {
  ProductImageRecord,
  ProductListQuery,
  ProductRecord,
  ProductStatus,
  ProductVariantRecord,
} from './product.interface.js';

export const PRODUCTS_REPOSITORY = Symbol('PRODUCTS_REPOSITORY');

export interface VariantWriteInput {
  sku: string;
  size: string;
  colorName: string;
  colorHex: string | null;
  combinationKey: string;
  priceOverridePiasters: number | null;
  stockQuantity: number;
  lowStockThreshold: number;
  isActive: boolean;
  position: number;
}

export interface VariantIdentity {
  id: string;
  productId: string;
  sku: string;
  size: string;
  colorName: string;
  isDeleted: boolean;
}

export interface VariantConflicts {
  bySku: VariantIdentity | null;
  byCombination: VariantIdentity | null;
}

export interface ProductCreateInput {
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
  variants: VariantWriteInput[];
  actorId: string;
}

export interface ProductUpdateInput {
  name?: string;
  slug?: string;
  description?: string;
  pricePiasters?: number;
  salePricePiasters?: number | null;
  sortPricePiasters?: number;
  categoryId?: string;
  brandId?: string;
  status?: ProductStatus;
  isFeatured?: boolean;
  isNewArrival?: boolean;
}

export interface ImageCreateInput {
  publicId: string;
  secureUrl: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  altText: string;
  position: number;
  isPrimary: boolean;
}

export interface ProductsRepository {
  listPublic(query: ProductListQuery): Promise<{ items: ProductRecord[]; total: number }>;
  listAdmin(query: ProductListQuery): Promise<{ items: ProductRecord[]; total: number }>;
  findPublicBySlug(slug: string): Promise<ProductRecord | null>;
  findById(id: string): Promise<ProductRecord | null>;
  catalogReferencesExist(categoryId: string, brandId: string): Promise<boolean>;
  create(input: ProductCreateInput): Promise<ProductRecord>;
  update(id: string, input: ProductUpdateInput): Promise<ProductRecord | null>;
  softDelete(id: string): Promise<boolean>;
  createVariant(
    productId: string,
    input: VariantWriteInput,
    actorId: string,
  ): Promise<ProductVariantRecord>;
  findVariant(productId: string, variantId: string): Promise<ProductVariantRecord | null>;
  findVariantConflicts(
    productId: string,
    sku: string,
    combinationKey: string,
  ): Promise<VariantConflicts>;
  restoreVariant(
    productId: string,
    variantId: string,
    input: VariantWriteInput,
    actorId: string,
  ): Promise<ProductVariantRecord | null>;
  updateVariant(
    productId: string,
    variantId: string,
    input: Partial<Omit<VariantWriteInput, 'stockQuantity'>>,
  ): Promise<ProductVariantRecord | null>;
  activeVariantCount(productId: string): Promise<number>;
  deactivateVariant(productId: string, variantId: string): Promise<boolean>;
  createImage(productId: string, input: ImageCreateInput): Promise<ProductImageRecord>;
  findImage(productId: string, imageId: string): Promise<ProductImageRecord | null>;
  updateImage(
    productId: string,
    imageId: string,
    input: { altText?: string; position?: number; isPrimary?: boolean },
  ): Promise<ProductImageRecord | null>;
  deleteImage(productId: string, imageId: string): Promise<ProductImageRecord | null>;
}
