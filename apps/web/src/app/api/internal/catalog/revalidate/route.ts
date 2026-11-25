import { timingSafeEqual } from 'node:crypto';
import { revalidateTag } from 'next/cache';

import { CATALOG_CACHE_TAG } from '@/lib/api/storefront';

export async function POST(request: Request): Promise<Response> {
  const headers = { 'cache-control': 'no-store' };
  const secret = process.env.CATALOG_REVALIDATION_SECRET;
  if (!secret || !/^[a-f0-9]{64}$/iu.test(secret))
    return new Response(null, { status: 404, headers });

  const expected = Buffer.from(`Bearer ${secret}`);
  const supplied = Buffer.from(request.headers.get('authorization') ?? '');
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return new Response(null, { status: 401, headers });
  }

  revalidateTag(CATALOG_CACHE_TAG);
  return new Response(null, { status: 204, headers });
}
