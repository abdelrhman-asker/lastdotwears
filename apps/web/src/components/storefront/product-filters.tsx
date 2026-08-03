import Link from 'next/link';

import type { Brand, Category } from '@/types/catalog';
import type { ProductListingQuery } from '@/lib/validation/storefront-query';

const selectClass =
  'h-11 w-full border border-stone-300 bg-transparent px-3 text-sm outline-none focus:border-stone-950';
const inputClass =
  'h-11 w-full border border-stone-300 bg-transparent px-3 text-sm outline-none placeholder:text-stone-400 focus:border-stone-950';

export function ProductFilters({
  action,
  query,
  categories,
  brands,
  lockedCategory,
}: {
  action: string;
  query: ProductListingQuery;
  categories: Category[];
  brands: Brand[];
  lockedCategory?: string;
}) {
  return (
    <details className="group border-y border-stone-300 lg:border-y-0" open={hasFilters(query)}>
      <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-xs tracking-[0.16em] uppercase lg:hidden">
        Filters & sorting
        <span className="text-lg font-light group-open:rotate-45">+</span>
      </summary>
      <form action={action} className="grid gap-4 pb-5 lg:grid-cols-6 lg:items-end lg:pb-0">
        {lockedCategory ? <input type="hidden" name="category" value={lockedCategory} /> : null}
        {query.q ? <input type="hidden" name="q" value={query.q} /> : null}
        {query.featured ? <input type="hidden" name="featured" value="true" /> : null}
        {query.newArrival ? <input type="hidden" name="newArrival" value="true" /> : null}
        {!lockedCategory ? (
          <FilterField label="Category">
            <select name="category" defaultValue={query.category ?? ''} className={selectClass}>
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
          </FilterField>
        ) : null}
        <FilterField label="Brand">
          <select name="brand" defaultValue={query.brand ?? ''} className={selectClass}>
            <option value="">All brands</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.slug}>
                {brand.name}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Size">
          <input
            name="size"
            defaultValue={query.size}
            placeholder="e.g. M"
            maxLength={40}
            className={inputClass}
          />
        </FilterField>
        <FilterField label="Color">
          <input
            name="color"
            defaultValue={query.color}
            placeholder="e.g. Black"
            maxLength={80}
            className={inputClass}
          />
        </FilterField>
        <div className="grid grid-cols-2 gap-2">
          <FilterField label="Min EGP">
            <input
              name="min"
              type="number"
              min="0"
              step="1"
              defaultValue={query.min}
              className={inputClass}
            />
          </FilterField>
          <FilterField label="Max EGP">
            <input
              name="max"
              type="number"
              min="0"
              step="1"
              defaultValue={query.max}
              className={inputClass}
            />
          </FilterField>
        </div>
        <FilterField label="Sort by">
          <select name="sort" defaultValue={query.sort} className={selectClass}>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
            <option value="name-asc">Name: A–Z</option>
          </select>
        </FilterField>
        <div className="flex gap-2 lg:col-span-full lg:justify-end">
          <Link
            href={action}
            className="grid h-11 flex-1 place-items-center border border-stone-300 px-5 text-xs uppercase lg:flex-none"
          >
            Clear
          </Link>
          <button
            type="submit"
            className="h-11 flex-1 bg-stone-950 px-6 text-xs tracking-[0.12em] text-white uppercase lg:flex-none"
          >
            Apply
          </button>
        </div>
      </form>
    </details>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] tracking-[0.16em] text-stone-500 uppercase">
        {label}
      </span>
      {children}
    </label>
  );
}

function hasFilters(query: ProductListingQuery): boolean {
  return Boolean(
    query.category || query.brand || query.size || query.color || query.min || query.max,
  );
}
