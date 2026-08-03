import {
  listingHref,
  parseProductListingQuery,
  toProductApiQuery,
} from '@/lib/validation/storefront-query';

describe('storefront product query', () => {
  it('normalizes valid user-facing filters', () => {
    expect(
      parseProductListingQuery({
        page: '2',
        q: '  linen  ',
        category: 'new-arrivals',
        min: '500',
        max: '2000',
        sort: 'price-asc',
      }),
    ).toEqual({
      page: 2,
      q: 'linen',
      category: 'new-arrivals',
      min: 500,
      max: 2000,
      sort: 'price-asc',
    });
  });

  it('falls back safely for malformed pagination and sort values', () => {
    expect(parseProductListingQuery({ page: '-8', category: '../bad', sort: 'random' })).toEqual({
      page: 1,
      sort: 'newest',
    });
  });

  it('converts EGP filters to integer piasters for the API', () => {
    const query = toProductApiQuery({ page: 1, min: 250, max: 1500, sort: 'price-desc' });
    expect(query).toContain('minPrice=25000');
    expect(query).toContain('maxPrice=150000');
  });

  it('builds canonical user-facing pagination links without default noise', () => {
    expect(listingHref('/products', { page: 3, q: 'shirt', sort: 'newest' })).toBe(
      '/products?page=3&q=shirt',
    );
  });
});
