import type { Metadata } from 'next';

import { ProductListing } from '@/components/storefront/product-listing';
import {
  parseProductListingQuery,
  type StorefrontSearchParams,
} from '@/lib/validation/storefront-query';

export const metadata: Metadata = {
  title: 'Shop all',
  description: 'Shop modern clothing, relaxed tailoring, and accessories delivered across Egypt.',
  alternates: { canonical: '/products' },
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<StorefrontSearchParams>;
}) {
  const query = parseProductListingQuery(await searchParams);
  const title = query.newArrival
    ? 'New arrivals'
    : query.featured
      ? 'The current edit'
      : 'Shop all';
  const eyebrow = query.newArrival ? 'Just in' : query.featured ? 'Selected' : 'The collection';

  return (
    <ProductListing
      action="/products"
      query={query}
      title={title}
      eyebrow={eyebrow}
      description="Considered silhouettes and everyday essentials, selected for modern life in Egypt."
    />
  );
}
