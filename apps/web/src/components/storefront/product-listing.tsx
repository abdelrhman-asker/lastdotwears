import { listPublicBrands, listPublicCategories, listPublicProducts } from '@/lib/api/storefront';
import type { ProductListingQuery } from '@/lib/validation/storefront-query';

import { Pagination } from './pagination';
import { ProductFilters } from './product-filters';
import { ProductGrid } from './product-grid';

export async function ProductListing({
  action,
  query,
  title,
  eyebrow,
  description,
  lockedCategory,
}: {
  action: string;
  query: ProductListingQuery;
  title: string;
  eyebrow: string;
  description?: string | null;
  lockedCategory?: string;
}) {
  const [products, categories, brands] = await Promise.all([
    listPublicProducts(query),
    listPublicCategories(),
    listPublicBrands(),
  ]);

  return (
    <div className="mx-auto max-w-[1600px] px-5 py-12 sm:px-8 lg:px-12 lg:py-18">
      <header className="max-w-3xl">
        <p className="text-[10px] tracking-[0.22em] text-stone-500 uppercase">{eyebrow}</p>
        <h1 className="mt-4 font-serif text-5xl leading-none tracking-[-0.04em] sm:text-6xl lg:text-7xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-5 max-w-2xl text-sm leading-6 text-stone-600">{description}</p>
        ) : null}
      </header>

      <div className="mt-10 lg:mt-14">
        <ProductFilters
          action={action}
          query={query}
          categories={categories}
          brands={brands}
          lockedCategory={lockedCategory}
        />
      </div>

      <div className="mt-7 flex items-center justify-between border-b border-stone-300 pb-4">
        <p className="text-xs text-stone-500">
          {products.total} {products.total === 1 ? 'piece' : 'pieces'}
        </p>
        <p className="text-[10px] tracking-[0.14em] text-stone-500 uppercase">
          Page {products.page}
        </p>
      </div>

      <div className="mt-7">
        <ProductGrid products={products.items} />
      </div>
      <Pagination pathname={action} query={query} totalPages={products.totalPages} />
    </div>
  );
}
