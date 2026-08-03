import Image from 'next/image';
import Link from 'next/link';

import { discountPercentage, formatEgp } from '@/lib/format/currency';
import type { Product } from '@/types/catalog';

import { WishlistButton } from './wishlist-button';

export function ProductCard({
  product,
  priority = false,
}: {
  product: Product;
  priority?: boolean;
}) {
  const image = product.images.find((candidate) => candidate.isPrimary) ?? product.images[0];
  const effectivePrice = product.salePricePiasters ?? product.pricePiasters;

  return (
    <article className="group min-w-0">
      <div className="relative aspect-[4/5] overflow-hidden bg-[#e9e5de]">
        <Link href={`/products/${product.slug}`} className="absolute inset-0 block">
          {image ? (
            <Image
              src={image.secureUrl}
              alt={image.altText || product.name}
              fill
              priority={priority}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.025]"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center bg-[linear-gradient(145deg,#ebe7df,#d9d2c7)]">
              <span className="text-[10px] tracking-[0.25em] text-stone-500 uppercase">
                Image coming soon
              </span>
            </div>
          )}
          <span className="sr-only">View {product.name}</span>
        </Link>
        <div className="absolute top-3 left-3 flex flex-col items-start gap-1.5">
          {product.isNewArrival ? (
            <span className="bg-[#f7f5f1] px-2.5 py-1 text-[9px] tracking-[0.16em] uppercase">
              New
            </span>
          ) : null}
          {product.salePricePiasters ? (
            <span className="bg-stone-950 px-2.5 py-1 text-[9px] tracking-[0.16em] text-white uppercase">
              −{discountPercentage(product.pricePiasters, product.salePricePiasters)}%
            </span>
          ) : null}
        </div>
        <WishlistButton
          productId={product.id}
          productName={product.name}
          className="absolute top-3 right-3 z-10 size-10 min-h-0 p-0"
        />
      </div>
      <Link href={`/products/${product.slug}`} className="block pt-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="truncate text-sm tracking-tight">{product.name}</h3>
            <p className="mt-1 text-xs text-stone-500">{product.brand.name}</p>
          </div>
          <div className="shrink-0 text-right text-sm">
            <span>{formatEgp(effectivePrice)}</span>
            {product.salePricePiasters ? (
              <span className="mt-1 block text-xs text-stone-400 line-through">
                {formatEgp(product.pricePiasters)}
              </span>
            ) : null}
          </div>
        </div>
        <p className="mt-2 truncate text-[11px] text-stone-500">
          {product.availableColors.join(', ')}
        </p>
      </Link>
    </article>
  );
}
