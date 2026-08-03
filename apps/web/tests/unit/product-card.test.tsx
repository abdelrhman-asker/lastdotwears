import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';

import { ProductCard } from '@/components/storefront/product-card';
import type { Product } from '@/types/catalog';

const product: Product = {
  id: 'a83f3ac3-58cb-43dc-aa5e-60509f718db8',
  name: 'Relaxed Cotton Shirt',
  slug: 'relaxed-cotton-shirt',
  description: 'A considered cotton shirt.',
  pricePiasters: 150_000,
  salePricePiasters: 120_000,
  categoryId: 'a6ab3bcc-54c3-4d09-9211-b3be355366eb',
  brandId: '82744973-6133-4aa9-ae1d-843bc11e1fde',
  status: 'ACTIVE',
  isFeatured: true,
  isNewArrival: true,
  category: { id: 'a6ab3bcc-54c3-4d09-9211-b3be355366eb', name: 'Men', slug: 'men' },
  brand: {
    id: '82744973-6133-4aa9-ae1d-843bc11e1fde',
    name: 'Cairo Essentials',
    slug: 'cairo-essentials',
  },
  variants: [],
  images: [],
  availableSizes: ['M'],
  availableColors: ['Black'],
  stockQuantity: 8,
  createdAt: '2026-08-02T00:00:00.000Z',
  updatedAt: '2026-08-02T00:00:00.000Z',
};

describe('ProductCard', () => {
  it('renders its product link, merchandising badges, and sale price', () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['commerce', 'wishlist'], {
      id: null,
      items: [],
      itemCount: 0,
      updatedAt: null,
    });
    render(
      <QueryClientProvider client={queryClient}>
        <ProductCard product={product} />
      </QueryClientProvider>,
    );

    expect(
      screen
        .getAllByRole('link')
        .every((link) => link.getAttribute('href') === '/products/relaxed-cotton-shirt'),
    ).toBe(true);
    expect(screen.getByRole('heading', { name: 'Relaxed Cotton Shirt' })).toBeTruthy();
    expect(screen.getByText('New')).toBeTruthy();
    expect(screen.getByText('−20%')).toBeTruthy();
    expect(screen.getByText(/EGP\s*1,200/u)).toBeTruthy();
    expect(screen.getByText(/EGP\s*1,500/u)).toBeTruthy();
  });
});
