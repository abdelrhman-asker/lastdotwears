import type { Metadata } from 'next';
import Link from 'next/link';

import { CatalogUnavailable } from '@/components/storefront/catalog-unavailable';
import { ArrowIcon } from '@/components/storefront/icons';
import { listPublicCategories } from '@/lib/api/storefront';
import type { Category } from '@/types/catalog';

export const metadata: Metadata = {
  title: 'Categories',
  description: 'Explore modern clothing and accessories by category.',
  alternates: { canonical: '/categories' },
};

export default async function CategoriesPage() {
  let categories: Category[] = [];
  let unavailable = false;
  try {
    categories = await listPublicCategories();
  } catch {
    unavailable = true;
  }

  return (
    <div className="mx-auto max-w-[1600px] px-5 py-14 sm:px-8 lg:px-12 lg:py-20">
      <header className="max-w-3xl">
        <p className="text-[10px] tracking-[0.22em] text-stone-500 uppercase">The collection</p>
        <h1 className="mt-4 font-serif text-6xl tracking-[-0.05em] sm:text-7xl">Categories</h1>
        <p className="mt-5 max-w-xl text-sm leading-6 text-stone-600">
          Build a considered wardrobe across relaxed tailoring, everyday layers, and useful
          accessories.
        </p>
      </header>

      <div className="mt-14">
        {unavailable ? (
          <CatalogUnavailable />
        ) : categories.length > 0 ? (
          <div className="grid gap-px bg-stone-300 sm:grid-cols-2 xl:grid-cols-3">
            {categories.map((category, index) => (
              <CategoryCard key={category.id} category={category} index={index} />
            ))}
          </div>
        ) : (
          <p className="border-y border-stone-300 py-20 text-center font-serif text-3xl">
            Categories are being prepared.
          </p>
        )}
      </div>
    </div>
  );
}

function CategoryCard({ category, index }: { category: Category; index: number }) {
  return (
    <Link
      href={`/categories/${category.slug}`}
      className="group relative flex min-h-[360px] flex-col justify-between overflow-hidden bg-[#e9e4da] p-7 transition-colors hover:bg-[#ddd5c8] lg:min-h-[460px] lg:p-10"
    >
      <div className="flex items-center justify-between text-[10px] tracking-[0.18em] text-stone-500 uppercase">
        <span>{String(index + 1).padStart(2, '0')}</span>
        <span>{category.productCount} pieces</span>
      </div>
      <div className="relative z-10">
        <h2 className="font-serif text-5xl tracking-[-0.05em]">{category.name}</h2>
        {category.description ? (
          <p className="mt-4 max-w-sm text-sm leading-6 text-stone-600">{category.description}</p>
        ) : null}
        <span className="mt-6 inline-flex items-center gap-3 text-xs tracking-[0.14em] uppercase">
          View category
          <ArrowIcon className="size-4 transition-transform group-hover:translate-x-1" />
        </span>
      </div>
      <span
        aria-hidden="true"
        className="absolute top-1/2 right-0 -translate-y-1/2 font-serif text-[16rem] leading-none text-stone-900/[0.035]"
      >
        {index + 1}
      </span>
    </Link>
  );
}
