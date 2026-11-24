import { describe, expect, it } from 'vitest';

import { canonicalSiteOrigin, canonicalUrl } from '@/lib/seo/canonical';

describe('canonical URLs', () => {
  it('uses the production apex origin', () => {
    expect(canonicalSiteOrigin).toBe('https://last-dot.com');
  });

  it.each([
    ['/', 'https://last-dot.com/'],
    ['/products', 'https://last-dot.com/products'],
    ['/products/example', 'https://last-dot.com/products/example'],
    ['https://images.example.com/product.jpg', 'https://images.example.com/product.jpg'],
  ])('resolves %s to a canonical production URL', (path, expected) => {
    expect(canonicalUrl(path)).toBe(expected);
  });
});
