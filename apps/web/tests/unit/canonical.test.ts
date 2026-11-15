import { describe, expect, it } from 'vitest';

import { canonicalSiteOrigin, canonicalUrl } from '@/lib/seo/canonical';

describe('canonical URLs', () => {
  it('uses the production www origin', () => {
    expect(canonicalSiteOrigin).toBe('https://www.last-dot.com');
  });

  it.each([
    ['/', 'https://www.last-dot.com/'],
    ['/products', 'https://www.last-dot.com/products'],
    ['/products/example', 'https://www.last-dot.com/products/example'],
    ['https://images.example.com/product.jpg', 'https://images.example.com/product.jpg'],
  ])('resolves %s to a canonical production URL', (path, expected) => {
    expect(canonicalUrl(path)).toBe(expected);
  });
});
