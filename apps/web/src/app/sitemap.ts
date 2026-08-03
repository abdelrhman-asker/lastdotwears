import type { MetadataRoute } from 'next';

import { listPublicCategories, listPublicProducts } from '@/lib/api/storefront';
import { clientEnvironment } from '@/lib/env/client';
import type { Product } from '@/types/catalog';

const staticPaths = ['', '/products', '/categories', '/about', '/contact', '/privacy', '/terms'];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = clientEnvironment.NEXT_PUBLIC_SITE_URL.replace(/\/$/u, '');
  const now = new Date();
  const entries: MetadataRoute.Sitemap = staticPaths.map((path) => ({
    url: `${origin}${path || '/'}`,
    lastModified: now,
    changeFrequency: path === '' || path === '/products' ? 'daily' : 'monthly',
    priority: path === '' ? 1 : path === '/products' ? 0.9 : 0.6,
  }));

  try {
    const categories = await listPublicCategories();
    entries.push(
      ...categories.map((category) => ({
        url: `${origin}/categories/${category.slug}`,
        lastModified: new Date(category.updatedAt),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      })),
    );

    const products: Product[] = [];
    let page = 1;
    let totalPages = 1;
    do {
      const result = await listPublicProducts({ page, sort: 'newest' }, 60);
      products.push(...result.items);
      totalPages = result.totalPages;
      page += 1;
    } while (page <= totalPages && page <= 100);

    entries.push(
      ...products.map((product) => ({
        url: `${origin}/products/${product.slug}`,
        lastModified: new Date(product.updatedAt),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
        images: product.images.slice(0, 1).map((image) => image.secureUrl),
      })),
    );
  } catch {
    // Static routes remain discoverable while the API is temporarily unavailable.
  }

  return entries;
}
