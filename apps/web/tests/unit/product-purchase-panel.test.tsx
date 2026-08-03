import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';

import { ProductPurchasePanel } from '@/components/storefront/product-purchase-panel';
import { commerceQueryKeys } from '@/hooks/use-commerce';
import type { ProductVariant } from '@/types/catalog';

const timestamp = '2026-08-02T00:00:00.000Z';

function variant(overrides: Partial<ProductVariant> = {}): ProductVariant {
  return {
    id: 'd9ff46ab-df98-4dfd-b49e-8d3459d1901b',
    productId: 'a83f3ac3-58cb-43dc-aa5e-60509f718db8',
    sku: 'SHIRT-BLK-M',
    size: 'M',
    colorName: 'Black',
    colorHex: '#171717',
    priceOverridePiasters: null,
    stockQuantity: 4,
    lowStockThreshold: 2,
    isActive: true,
    position: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

function renderPanel(variants: ProductVariant[]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  queryClient.setQueryData(commerceQueryKeys.wishlist, {
    id: null,
    items: [],
    itemCount: 0,
    updatedAt: null,
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ProductPurchasePanel
        productId="a83f3ac3-58cb-43dc-aa5e-60509f718db8"
        productName="Relaxed Cotton Shirt"
        variants={variants}
      />
    </QueryClientProvider>,
  );
}

describe('ProductPurchasePanel', () => {
  it('requires an in-stock size before enabling add to bag', () => {
    renderPanel([variant()]);

    const addButton = screen.getByRole('button', { name: 'Select a size' });
    expect(addButton.hasAttribute('disabled')).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'M' }));

    expect(screen.getByRole('button', { name: 'Add to bag' }).hasAttribute('disabled')).toBe(false);
    expect(screen.getByText('4 available')).toBeTruthy();
  });

  it('prevents selecting an out-of-stock variant', () => {
    renderPanel([variant({ stockQuantity: 0 })]);

    expect(screen.getByRole('button', { name: 'M' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: 'Select a size' }).hasAttribute('disabled')).toBe(
      true,
    );
    expect(screen.getByText('Out of stock')).toBeTruthy();
  });
});
