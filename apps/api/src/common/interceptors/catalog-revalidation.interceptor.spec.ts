import type { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { defer, lastValueFrom, of, throwError } from 'rxjs';

import { CatalogRevalidationInterceptor } from './catalog-revalidation.interceptor.js';

const secret = 'a'.repeat(64);
const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function context(method: string): ExecutionContext {
  return { switchToHttp: () => ({ getRequest: () => ({ method }) }) } as ExecutionContext;
}

function interceptor(key = secret) {
  return new CatalogRevalidationInterceptor(
    new ConfigService({
      WEB_APP_URL: 'https://www.last-dot.com',
      CATALOG_REVALIDATION_SECRET: key,
    }),
  );
}

describe('Catalog revalidation after admin mutations', () => {
  it.each(['POST', 'PATCH', 'DELETE'])(
    'invalidates only after a successful %s handler',
    async (method) => {
      const events: string[] = [];
      globalThis.fetch = (url, options) => {
        events.push('invalidate');
        expect(url).toEqual(new URL('https://www.last-dot.com/api/internal/catalog/revalidate'));
        expect(options).toMatchObject({
          method: 'POST',
          headers: { authorization: `Bearer ${secret}` },
          redirect: 'error',
        });
        return Promise.resolve(new Response(null, { status: 204 }));
      };
      const next = {
        handle: () =>
          defer(() => {
            events.push('saved');
            return of({ slug: 'greypants' });
          }),
      };
      await expect(lastValueFrom(interceptor().intercept(context(method), next))).resolves.toEqual({
        slug: 'greypants',
      });
      expect(events).toEqual(['saved', 'invalidate']);
    },
  );

  it('leaves reads, failed mutations and unconfigured environments alone', async () => {
    let calls = 0;
    globalThis.fetch = () => {
      calls += 1;
      return Promise.resolve(new Response(null, { status: 204 }));
    };
    const next = { handle: () => of(undefined) };
    await lastValueFrom(interceptor().intercept(context('GET'), next));
    await lastValueFrom(interceptor('').intercept(context('POST'), next));
    await expect(
      lastValueFrom(
        interceptor().intercept(context('PATCH'), {
          handle: () => throwError(() => new Error('Invalid catalog change')),
        }),
      ),
    ).rejects.toThrow('Invalid catalog change');
    expect(calls).toBe(0);
  });

  it('retries a failed webhook and preserves a committed mutation when delivery still fails', async () => {
    let calls = 0;
    globalThis.fetch = () => {
      calls += 1;
      return Promise.resolve(new Response(null, { status: 503 }));
    };
    await expect(
      lastValueFrom(
        interceptor().intercept(context('DELETE'), {
          handle: () => of(undefined),
        }),
      ),
    ).resolves.toBeUndefined();
    expect(calls).toBe(2);
  });
});
