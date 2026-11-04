import { fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { FashionHero } from '@/components/storefront/fashion-hero';
import type { Product } from '@/types/catalog';

const baseProduct: Product = {
  id: 'product-one',
  name: 'Relaxed Cotton Shirt',
  slug: 'relaxed-cotton-shirt',
  description: 'A relaxed cotton shirt.',
  pricePiasters: 150_000,
  salePricePiasters: null,
  categoryId: 'category-one',
  brandId: 'brand-one',
  status: 'ACTIVE',
  isFeatured: true,
  isNewArrival: false,
  category: { id: 'category-one', name: 'Shirts', slug: 'shirts' },
  brand: { id: 'brand-one', name: 'Last Dot', slug: 'last-dot' },
  variants: [
    {
      id: 'variant-one',
      productId: 'product-one',
      sku: 'SHIRT-BURGUNDY-M',
      size: 'M',
      colorName: 'Burgundy',
      colorHex: '#75142E',
      priceOverridePiasters: null,
      stockQuantity: 4,
      lowStockThreshold: 2,
      isActive: true,
      position: 0,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  images: [
    {
      id: 'front-image',
      productId: 'product-one',
      publicId: 'front-image',
      secureUrl: '/images/editorial-hero.png',
      width: 1200,
      height: 1500,
      format: 'png',
      bytes: 1000,
      altText: 'Front view of relaxed cotton shirt',
      position: 0,
      isPrimary: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'side-image',
      productId: 'product-one',
      publicId: 'side-image',
      secureUrl: '/images/editorial-hero.png',
      width: 1200,
      height: 1500,
      format: 'png',
      bytes: 1000,
      altText: 'Side view of relaxed cotton shirt',
      position: 1,
      isPrimary: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  availableSizes: ['M'],
  availableColors: ['White'],
  stockQuantity: 4,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const secondProduct: Product = {
  ...baseProduct,
  id: 'product-two',
  name: 'Soft Tailored Trouser',
  slug: 'soft-tailored-trouser',
  pricePiasters: 220_000,
  stockQuantity: 0,
  variants: [
    {
      ...baseProduct.variants[0]!,
      id: 'variant-two',
      productId: 'product-two',
      sku: 'TROUSER-NAVY-M',
      colorName: 'Navy',
      colorHex: '#254878',
      stockQuantity: 0,
    },
  ],
};

const frontOnlyProduct: Product = {
  ...baseProduct,
  id: 'front-only-product',
  name: 'Front Only Tee',
  slug: 'front-only-tee',
  images: [baseProduct.images[0]],
};

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockReturnValue({ matches: false }),
  });
  Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
    configurable: true,
    value: vi.fn(),
  });
});

describe('FashionHero', () => {
  it('selects real products and updates the product action', () => {
    const { container } = render(
      <FashionHero
        products={[baseProduct, secondProduct]}
        storeName="Last Dot"
        announcement="Delivery across Egypt"
      />,
    );

    expect(screen.getByRole('heading', { name: 'Relaxed Cotton Shirt' })).toBeTruthy();
    expect(container.querySelector('[data-product-view="side"]')).toBeTruthy();
    expect(container.querySelector('[data-product-view="front"]')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Explore product' }).getAttribute('href')).toBe(
      '/products/relaxed-cotton-shirt',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Select Soft Tailored Trouser' }));

    expect(screen.getByRole('heading', { name: 'Soft Tailored Trouser' })).toBeTruthy();
    expect(screen.getByText('Out of stock')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Explore product' }).getAttribute('href')).toBe(
      '/products/soft-tailored-trouser',
    );
  });

  it('renders a front-only product without rotation while still making it active on hover', () => {
    const { container } = render(
      <FashionHero
        products={[baseProduct, frontOnlyProduct]}
        storeName="Last Dot"
        announcement="Delivery across Egypt"
      />,
    );

    const frontOnlyButton = screen.getByRole('button', { name: 'Select Front Only Tee' });
    expect(frontOnlyButton.getAttribute('data-has-side-view')).toBe('false');
    expect(frontOnlyButton.querySelector('[data-product-view="front"]')).toBeTruthy();
    expect(frontOnlyButton.querySelector('[data-product-view="side"]')).toBeNull();

    fireEvent.mouseEnter(frontOnlyButton);

    expect(frontOnlyButton.getAttribute('data-active')).toBe('true');
    expect(container.querySelector('[data-active="true"]')?.getAttribute('aria-label')).toBe(
      'Select Front Only Tee',
    );
  });

  it('uses the hovered product color and details for the active presentation', () => {
    const { container } = render(
      <FashionHero
        products={[baseProduct, secondProduct]}
        storeName="Last Dot"
        announcement="Delivery across Egypt"
      />,
    );

    const campaign = container.querySelector('section');
    expect(campaign?.getAttribute('style')).toContain('--campaign-color: #75142E');

    const hoveredProduct = screen.getByRole('button', { name: 'Select Soft Tailored Trouser' });
    fireEvent.mouseEnter(hoveredProduct);

    expect(screen.getByRole('heading', { name: 'Soft Tailored Trouser' })).toBeTruthy();
    expect(campaign?.getAttribute('style')).toContain('--campaign-color: #254878');

    fireEvent.mouseLeave(hoveredProduct);

    expect(hoveredProduct.getAttribute('data-active')).toBe('true');
    expect(hoveredProduct.getAttribute('data-hovered')).toBe('true');
    expect(screen.getByRole('heading', { name: 'Soft Tailored Trouser' })).toBeTruthy();
    expect(campaign?.getAttribute('style')).toContain('--campaign-color: #254878');
  });
});
