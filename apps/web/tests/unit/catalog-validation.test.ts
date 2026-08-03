import { describe, expect, it } from 'vitest';

import {
  egpToPiasters,
  productCreateSchema,
  taxonomySchema,
  variantSchema,
} from '@/lib/validation/catalog';

describe('catalog validation', () => {
  it('converts entered EGP values to exact integer piasters', () => {
    expect(egpToPiasters('1499.95')).toBe(149_995);
  });

  it('rejects a sale price that is not lower than regular price', () => {
    const result = productCreateSchema.safeParse({
      name: 'Cotton Shirt',
      slug: 'cotton-shirt',
      description: 'A clean cotton shirt.',
      priceEgp: '1000.00',
      salePriceEgp: '1000.00',
      categoryId: '35317274-7c03-4893-a896-b36205fc72ac',
      brandId: 'bfdb67f1-ae52-44b5-b69c-d37c56ae6977',
      status: 'DRAFT',
      isFeatured: false,
      isNewArrival: true,
      sku: 'SHIRT-BLK-M',
      size: 'M',
      colorName: 'Black',
      colorHex: '#111111',
      stockQuantity: 5,
      lowStockThreshold: 2,
    });
    expect(result.success).toBe(false);
  });

  it('enforces clean taxonomy slugs and non-negative variant stock', () => {
    expect(
      taxonomySchema.safeParse({
        name: 'Women',
        slug: 'Women Clothing',
        description: '',
        isActive: true,
      }).success,
    ).toBe(false);
    expect(
      variantSchema.safeParse({
        sku: 'SHIRT-BLK-M',
        size: 'M',
        colorName: 'Black',
        colorHex: '#111111',
        stockQuantity: -1,
        lowStockThreshold: 2,
      }).success,
    ).toBe(false);
  });
});
