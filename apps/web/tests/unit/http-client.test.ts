import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/env/client', () => ({
  clientEnvironment: {
    NEXT_PUBLIC_API_URL: 'https://last-dot.com/api/v1',
  },
}));

import { apiBlobRequest, apiRequest } from '@/lib/api/http-client';

describe('apiRequest CSRF recovery', () => {
  afterEach(() => {
    document.cookie = 'csrf_token=; Max-Age=0; path=/';
    vi.unstubAllGlobals();
  });

  it('rotates a stale CSRF cookie and retries an unsafe request once', async () => {
    document.cookie = 'csrf_token=stale-token; path=/';
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: 403,
            detail: 'The CSRF token is missing or invalid.',
          }),
          { status: 403, headers: { 'content-type': 'application/problem+json' } },
        ),
      )
      .mockImplementationOnce(async () => {
        return new Response(JSON.stringify({ csrfToken: 'fresh-token' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      })
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      apiRequest('/cart/items/variant-id', { method: 'DELETE' }),
    ).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/v1/auth/csrf');
    expect(new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get('x-csrf-token')).toBe(
      'stale-token',
    );
    expect(new Headers(fetchMock.mock.calls[2]?.[1]?.headers).get('x-csrf-token')).toBe(
      'fresh-token',
    );
  });

  it('loads a protected image with browser credentials', async () => {
    const bytes = new Uint8Array([137, 80, 78, 71]);
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(bytes, { status: 200, headers: { 'content-type': 'image/png' } }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const image = await apiBlobRequest('/admin/orders/order-id/payment-proof');

    expect(image.type).toBe('image/png');
    expect(image.size).toBe(bytes.length);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/admin/orders/order-id/payment-proof',
      expect.objectContaining({ credentials: 'include', method: 'GET' }),
    );
  });
});
