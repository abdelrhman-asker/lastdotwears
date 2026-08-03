import 'server-only';

import { cache } from 'react';

import { getServerEnvironment } from '@/lib/env/server';
import { toProductApiQuery, type ProductListingQuery } from '@/lib/validation/storefront-query';
import type { Brand, Category, Paginated, Product } from '@/types/catalog';
import type { PublicWebsiteSettings } from '@/types/settings';

export class CatalogUnavailableError extends Error {
  constructor() {
    super('The catalog service is temporarily unavailable.');
    this.name = 'CatalogUnavailableError';
  }
}

export const defaultHomepageBanner: PublicWebsiteSettings['banners'][number] = {
  id: 'fallback',
  eyebrow: 'The warm-weather edit · 2026',
  title: 'Quiet form. Made for Cairo.',
  description:
    'Lightweight tailoring and clean everyday layers, considered for the rhythm and warmth of the city.',
  imageUrl: '/images/editorial-hero.png',
  imagePublicId: null,
  altText: 'Two models wearing relaxed neutral tailoring in a sunlit limestone courtyard',
  ctaLabel: 'Shop new arrivals',
  ctaUrl: '/products?newArrival=true',
  position: 0,
  isActive: true,
  startsAt: null,
  endsAt: null,
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
};

const fallbackSettings: PublicWebsiteSettings = {
  storeName: 'Last-Dot Wears',
  tagline: 'Modern essentials, considered for life in Egypt.',
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? 'care@lastdotwears.com',
  contactPhone: null,
  storeAddress: null,
  businessHours: 'Sunday-Thursday, 10:00-18:00 Cairo time',
  announcementText: null,
  announcementEnabled: false,
  cashOnDeliveryEnabled: true,
  instaPayEnabled: true,
  socialLinks: [],
  banners: [defaultHomepageBanner],
};

export const getPublicWebsiteSettings = cache(async (): Promise<PublicWebsiteSettings> => {
  try {
    return await publicCatalogRequest<PublicWebsiteSettings>('/settings', ['website-settings']);
  } catch {
    return fallbackSettings;
  }
});

async function publicCatalogRequest<T>(path: string, tags: string[]): Promise<T> {
  const response = await fetch(`${getServerEnvironment().INTERNAL_API_URL}${path}`, {
    headers: { accept: 'application/json' },
    next: { revalidate: 300, tags },
  });
  if (!response.ok) throw new CatalogUnavailableError();
  return (await response.json()) as T;
}

export const listPublicCategories = cache(async (): Promise<Category[]> =>
  publicCatalogRequest<Category[]>('/categories', ['catalog', 'categories']),
);

export const listPublicBrands = cache(async (): Promise<Brand[]> =>
  publicCatalogRequest<Brand[]>('/brands', ['catalog', 'brands']),
);

export async function listPublicProducts(
  query: ProductListingQuery,
  limit = 24,
): Promise<Paginated<Product>> {
  return publicCatalogRequest<Paginated<Product>>(`/products?${toProductApiQuery(query, limit)}`, [
    'catalog',
    'products',
  ]);
}

export const getPublicProduct = cache(async (slug: string): Promise<Product | null> => {
  const response = await fetch(
    `${getServerEnvironment().INTERNAL_API_URL}/products/${encodeURIComponent(slug)}`,
    {
      headers: { accept: 'application/json' },
      next: { revalidate: 300, tags: ['catalog', 'products'] },
    },
  );
  if (response.status === 404) return null;
  if (!response.ok) throw new CatalogUnavailableError();
  return (await response.json()) as Product;
});

export const getPublicCategory = cache(async (slug: string): Promise<Category | null> => {
  const response = await fetch(
    `${getServerEnvironment().INTERNAL_API_URL}/categories/${encodeURIComponent(slug)}`,
    {
      headers: { accept: 'application/json' },
      next: { revalidate: 300, tags: ['catalog', 'categories'] },
    },
  );
  if (response.status === 404) return null;
  if (!response.ok) throw new CatalogUnavailableError();
  return (await response.json()) as Category;
});

export async function safeHomeCatalog(): Promise<{
  categories: Category[];
  featured: Product[];
  newArrivals: Product[];
  unavailable: boolean;
}> {
  try {
    const [categories, featured, newArrivals] = await Promise.all([
      listPublicCategories(),
      listPublicProducts({ page: 1, sort: 'newest', featured: true }, 4),
      listPublicProducts({ page: 1, sort: 'newest', newArrival: true }, 4),
    ]);
    return {
      categories,
      featured: featured.items,
      newArrivals: newArrivals.items,
      unavailable: false,
    };
  } catch {
    return { categories: [], featured: [], newArrivals: [], unavailable: true };
  }
}
