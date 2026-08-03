import type { Metadata } from 'next';

import { SearchIcon } from '@/components/storefront/icons';
import { ProductListing } from '@/components/storefront/product-listing';
import {
  parseProductListingQuery,
  type StorefrontSearchParams,
} from '@/lib/validation/storefront-query';

export const metadata: Metadata = {
  title: 'Search',
  description: 'Search the Last-Dot Wears clothing collection.',
  alternates: { canonical: '/search' },
  robots: { index: false, follow: true },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<StorefrontSearchParams>;
}) {
  const query = parseProductListingQuery(await searchParams);

  if (!query.q) {
    return (
      <section className="mx-auto flex min-h-[65vh] max-w-4xl flex-col justify-center px-5 py-20 text-center sm:px-8">
        <p className="text-[10px] tracking-[0.22em] text-stone-500 uppercase">Find a piece</p>
        <h1 className="mt-4 font-serif text-6xl tracking-[-0.05em] sm:text-7xl">Search</h1>
        <form
          action="/search"
          role="search"
          className="mx-auto mt-10 flex w-full max-w-2xl border-b border-stone-950"
        >
          <label htmlFor="search-page-query" className="sr-only">
            Search by product, brand, or description
          </label>
          <input
            id="search-page-query"
            name="q"
            type="search"
            required
            maxLength={120}
            autoFocus
            placeholder="Product, brand, or category"
            className="min-w-0 flex-1 bg-transparent px-1 py-4 text-lg outline-none placeholder:text-stone-400"
          />
          <button type="submit" aria-label="Search" className="grid size-14 place-items-center">
            <SearchIcon className="size-6" />
          </button>
        </form>
      </section>
    );
  }

  return (
    <ProductListing
      action="/search"
      query={query}
      title={`“${query.q}”`}
      eyebrow="Search results"
      description="Refine the results by category, brand, size, color, or price."
    />
  );
}
