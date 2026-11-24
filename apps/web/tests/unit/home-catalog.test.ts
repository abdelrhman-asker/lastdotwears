import { afterEach, describe, expect, it, vi } from 'vitest';

import { listPublicProducts, safeHomeCatalog } from '@/lib/api/storefront';

vi.mock('@/lib/env/server', () => ({
  getServerEnvironment: () => ({ INTERNAL_API_URL: 'http://fixture.test/api/v1' }),
}));

const hoodie = {
  id: 'hoodie-fixture',
  status: 'ACTIVE',
  isFeatured: true,
  isNewArrival: true,
  stockQuantity: 10,
  images: [
    { isPrimary: true, secureUrl: 'https://res.cloudinary.com/fixture/image/upload/front.png' },
    { isPrimary: false, secureUrl: 'https://res.cloudinary.com/fixture/image/upload/side.png' },
  ],
};

afterEach(() => vi.unstubAllGlobals());

describe('homepage catalog', () => {
  it('sees a publish on the next homepage request while keeping the standard catalog cache', async () => {
    let published = false;
    const fetchMock = vi.fn((url: string) =>
      Promise.resolve(
        Response.json(url.endsWith('/categories') ? [] : { items: published ? [hoodie] : [] }),
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(safeHomeCatalog()).resolves.toMatchObject({
      featured: { items: [], unavailable: false },
    });
    published = true;
    await expect(safeHomeCatalog()).resolves.toMatchObject({
      featured: { items: [hoodie], unavailable: false },
      newArrivals: { items: [hoodie], unavailable: false },
    });
    const params = 'page=1&limit=4&sort=newest';
    for (const flag of ['featured', 'newArrival']) {
      expect(fetchMock).toHaveBeenCalledWith(
        `http://fixture.test/api/v1/products?${params}&${flag}=true`,
        { headers: { accept: 'application/json' }, cache: 'no-store' },
      );
    }

    await listPublicProducts({ page: 1, sort: 'newest' });
    expect(fetchMock).toHaveBeenLastCalledWith(
      'http://fixture.test/api/v1/products?page=1&limit=24&sort=newest',
      expect.objectContaining({ next: { revalidate: 300, tags: ['catalog', 'products'] } }),
    );
  });

  it('retains a working featured list when categories or new arrivals fail', async () => {
    vi.stubGlobal('fetch', (url: string) =>
      Promise.resolve(
        url.includes('featured=true')
          ? Response.json({ items: [hoodie] })
          : new Response(null, { status: 503 }),
      ),
    );
    await expect(safeHomeCatalog()).resolves.toEqual({
      featured: { items: [hoodie], unavailable: false },
      newArrivals: { items: [], unavailable: true },
      categories: { items: [], unavailable: true },
    });
  });
});
