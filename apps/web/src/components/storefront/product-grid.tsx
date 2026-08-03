import Link from 'next/link';

import type { Product } from '@/types/catalog';

import { ProductCard } from './product-card';

export function ProductGrid({
  products,
  emptyMessage = 'No pieces match these filters.',
}: {
  products: Product[];
  emptyMessage?: string;
}) {
  if (products.length === 0) {
    return (
      <div className="border-y border-stone-300 py-24 text-center">
        <p className="font-serif text-3xl tracking-tight">{emptyMessage}</p>
        <p className="mt-3 text-sm text-stone-500">Try a broader search or clear your filters.</p>
        <Link href="/products" className="mt-7 inline-block border-b border-stone-900 pb-1 text-sm">
          View all products
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 lg:grid-cols-3 xl:grid-cols-4 xl:gap-x-6 xl:gap-y-14">
      {products.map((product, index) => (
        <ProductCard key={product.id} product={product} priority={index < 4} />
      ))}
    </div>
  );
}
