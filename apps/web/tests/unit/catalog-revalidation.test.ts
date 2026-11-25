import { afterEach, describe, expect, it, vi } from 'vitest';

import { POST } from '@/app/api/internal/catalog/revalidate/route';
import { listPublicProducts } from '@/lib/api/storefront';

const { invalidate } = vi.hoisted(() => ({ invalidate: vi.fn() }));
vi.mock('next/cache', () => ({ revalidateTag: invalidate }));
vi.mock('@/lib/env/server', () => ({
  getServerEnvironment: () => ({ INTERNAL_API_URL: 'http://catalog.test/api/v1' }),
}));

const secret = 'a'.repeat(64);
const listing = { page: 1, sort: 'newest', featured: true } as const;

function notify(authorization?: string) {
  return POST(
    new Request('http://store.test/api/internal/catalog/revalidate', {
      method: 'POST',
      ...(authorization ? { headers: { authorization } } : {}),
    }),
  );
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  invalidate.mockReset();
});

describe('storefront catalog invalidation', () => {
  it('rejects missing and incorrect credentials, and is unavailable when unconfigured', async () => {
    vi.stubEnv('CATALOG_REVALIDATION_SECRET', '');
    expect((await notify()).status).toBe(404);
    vi.stubEnv('CATALOG_REVALIDATION_SECRET', secret);
    expect((await notify()).status).toBe(401);
    expect((await notify('Bearer ' + 'b'.repeat(64))).status).toBe(401);
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('expires the cache for newly created featured products and existing products whose visibility changes', async () => {
    vi.stubEnv('CATALOG_REVALIDATION_SECRET', secret);
    let items = [{ slug: 'existing-featured', status: 'ACTIVE', isFeatured: true }];
    let cached: string | undefined;
    const fetchCatalog = vi.fn(
      (url: string, options: { next: { tags: string[]; revalidate: number } }) => {
        expect(url).toBe(
          'http://catalog.test/api/v1/products?page=1&limit=24&sort=newest&featured=true',
        );
        expect(options.next).toEqual({ tags: ['catalog', 'products'], revalidate: 300 });
        invalidate.mockImplementationOnce((tag: string) => {
          if (options.next.tags.includes(tag)) cached = undefined;
        });
        cached ??= JSON.stringify({ items });
        return Promise.resolve(new Response(cached));
      },
    );
    vi.stubGlobal('fetch', fetchCatalog);

    const oldListing = await listPublicProducts(listing);
    items = [{ slug: 'greypants', status: 'ACTIVE', isFeatured: true }];
    expect(await listPublicProducts(listing)).toEqual(oldListing);
    expect((await notify(`Bearer ${secret}`)).status).toBe(204);
    expect(await listPublicProducts(listing)).toEqual({ items });
    expect(invalidate).toHaveBeenCalledWith('catalog');
  });
});
