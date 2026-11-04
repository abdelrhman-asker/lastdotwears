import { apiRequest } from '@/lib/api/http-client';
import type {
  Brand,
  Category,
  InventoryItem,
  Paginated,
  Product,
  ProductImage,
  ProductStatus,
  ProductVariant,
} from '@/types/catalog';

export interface TaxonomyInput {
  name: string;
  slug?: string;
  description?: string | null;
  isActive?: boolean;
}

export function listAdminCategories(): Promise<Paginated<Category>> {
  return apiRequest('/admin/categories?limit=100');
}

export function createCategory(input: TaxonomyInput): Promise<Category> {
  return apiRequest('/admin/categories', { body: input, method: 'POST' });
}

export function updateCategory(id: string, input: TaxonomyInput): Promise<Category> {
  return apiRequest(`/admin/categories/${id}`, { body: input, method: 'PATCH' });
}

export function deleteCategory(id: string): Promise<void> {
  return apiRequest(`/admin/categories/${id}`, { method: 'DELETE' });
}

export function listAdminBrands(): Promise<Paginated<Brand>> {
  return apiRequest('/admin/brands?limit=100');
}

export function createBrand(input: TaxonomyInput): Promise<Brand> {
  return apiRequest('/admin/brands', { body: input, method: 'POST' });
}

export function updateBrand(id: string, input: TaxonomyInput): Promise<Brand> {
  return apiRequest(`/admin/brands/${id}`, { body: input, method: 'PATCH' });
}

export function deleteBrand(id: string): Promise<void> {
  return apiRequest(`/admin/brands/${id}`, { method: 'DELETE' });
}

export interface AdminProductFilters {
  page?: number;
  search?: string;
  status?: ProductStatus | '';
}

export function listAdminProducts(filters: AdminProductFilters): Promise<Paginated<Product>> {
  const query = new URLSearchParams({ page: String(filters.page ?? 1), limit: '20' });
  if (filters.search) query.set('search', filters.search);
  if (filters.status) query.set('status', filters.status);
  return apiRequest(`/admin/products?${query.toString()}`);
}

export interface ProductCreateInput {
  name: string;
  slug?: string;
  description: string;
  pricePiasters: number;
  salePricePiasters?: number;
  categoryId: string;
  brandId: string;
  status: 'DRAFT' | 'ACTIVE';
  isFeatured: boolean;
  isNewArrival: boolean;
  variants: Array<{
    sku: string;
    size: string;
    colorName: string;
    colorHex?: string;
    stockQuantity: number;
    lowStockThreshold: number;
  }>;
}

export function createProduct(input: ProductCreateInput): Promise<Product> {
  return apiRequest('/admin/products', { body: input, method: 'POST' });
}

export function getAdminProduct(id: string): Promise<Product> {
  return apiRequest(`/admin/products/${id}`);
}

export function updateProduct(
  id: string,
  input: {
    name?: string;
    slug?: string;
    description?: string;
    pricePiasters?: number;
    salePricePiasters?: number | null;
    categoryId?: string;
    brandId?: string;
    status?: ProductStatus;
    isFeatured?: boolean;
    isNewArrival?: boolean;
  },
): Promise<Product> {
  return apiRequest(`/admin/products/${id}`, { body: input, method: 'PATCH' });
}

export function deleteProduct(id: string): Promise<void> {
  return apiRequest(`/admin/products/${id}`, { method: 'DELETE' });
}

export function createVariant(
  productId: string,
  input: ProductCreateInput['variants'][number],
): Promise<ProductVariant> {
  return apiRequest(`/admin/products/${productId}/variants`, { body: input, method: 'POST' });
}

export function updateVariant(
  productId: string,
  variantId: string,
  input: {
    sku?: string;
    size?: string;
    colorName?: string;
    colorHex?: string | null;
    priceOverridePiasters?: number | null;
    lowStockThreshold?: number;
    isActive?: boolean;
    position?: number;
  },
): Promise<ProductVariant> {
  return apiRequest(`/admin/products/${productId}/variants/${variantId}`, {
    body: input,
    method: 'PATCH',
  });
}

export function deleteVariant(productId: string, variantId: string): Promise<void> {
  return apiRequest(`/admin/products/${productId}/variants/${variantId}`, { method: 'DELETE' });
}

export function uploadProductImage(productId: string, body: FormData): Promise<ProductImage> {
  return apiRequest(`/admin/products/${productId}/images`, { body, method: 'POST' });
}

export function updateProductImage(
  productId: string,
  imageId: string,
  input: { altText?: string; position?: number; isPrimary?: boolean },
): Promise<ProductImage> {
  return apiRequest(`/admin/products/${productId}/images/${imageId}`, {
    body: input,
    method: 'PATCH',
  });
}

export function deleteProductImage(productId: string, imageId: string): Promise<void> {
  return apiRequest(`/admin/products/${productId}/images/${imageId}`, { method: 'DELETE' });
}

export function listInventory(filters: {
  page?: number;
  search?: string;
  lowStock?: boolean;
}): Promise<Paginated<InventoryItem>> {
  const query = new URLSearchParams({ page: String(filters.page ?? 1), limit: '50' });
  if (filters.search) query.set('search', filters.search);
  if (filters.lowStock) query.set('lowStock', 'true');
  return apiRequest(`/admin/inventory?${query.toString()}`);
}

export function adjustInventory(
  variantId: string,
  input: { quantityDelta: number; type: 'RESTOCK' | 'ADJUSTMENT'; reason: string },
): Promise<InventoryItem> {
  return apiRequest(`/admin/inventory/${variantId}/adjustments`, { body: input, method: 'POST' });
}
