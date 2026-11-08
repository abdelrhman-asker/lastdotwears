'use client';

import Image from 'next/image';
import Link from 'next/link';

import { useToggleWishlist, useWishlist } from '@/hooks/use-commerce';
import { captureAnalyticsEvent } from '@/lib/analytics/client';
import { errorMessage } from '@/lib/api/http-client';
import { formatEgp } from '@/lib/format/currency';

export function WishlistPage() {
  const wishlist = useWishlist();
  const toggle = useToggleWishlist();

  if (wishlist.isPending) {
    return (
      <div className="mx-auto min-h-[65vh] max-w-[1500px] animate-pulse px-5 py-16 sm:px-8 lg:px-12">
        <div className="h-14 w-72 bg-stone-200" />
        <div className="mt-12 h-80 bg-stone-200" />
      </div>
    );
  }
  if (wishlist.isError) {
    return (
      <section className="grid min-h-[65vh] place-items-center px-6 text-center">
        <div>
          <h1 className="font-serif text-4xl">Your wishlist could not be loaded.</h1>
          <p className="mt-3 text-sm text-stone-500">{errorMessage(wishlist.error)}</p>
          <button
            type="button"
            onClick={() => void wishlist.refetch()}
            className="mt-7 bg-stone-950 px-6 py-3 text-sm text-white"
          >
            Try again
          </button>
        </div>
      </section>
    );
  }
  if (!wishlist.data || wishlist.data.items.length === 0) {
    return (
      <section className="grid min-h-[65vh] place-items-center px-6 py-24 text-center">
        <div>
          <p className="text-[10px] tracking-[0.22em] text-stone-500 uppercase">Wishlist</p>
          <h1 className="mt-5 font-serif text-5xl tracking-[-0.045em]">Nothing saved yet.</h1>
          <p className="mt-4 text-sm text-stone-500">Keep the pieces you want to return to here.</p>
          <Link
            href="/products"
            className="mt-8 inline-block bg-stone-950 px-7 py-3.5 text-xs tracking-[0.14em] text-white uppercase"
          >
            Explore products
          </Link>
        </div>
      </section>
    );
  }

  return (
    <div className="mx-auto max-w-[1500px] px-5 py-14 sm:px-8 lg:px-12 lg:py-20">
      <header className="flex items-end justify-between border-b border-stone-300 pb-8">
        <div>
          <p className="text-[10px] tracking-[0.22em] text-stone-500 uppercase">Saved for later</p>
          <h1 className="mt-4 font-serif text-5xl tracking-[-0.045em] sm:text-6xl">Wishlist</h1>
        </div>
        <p className="hidden text-sm text-stone-500 sm:block">{wishlist.data.itemCount} pieces</p>
      </header>

      <div className="mt-10 grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 lg:grid-cols-3 xl:grid-cols-4 xl:gap-x-6">
        {wishlist.data.items.map((item) => {
          const price = item.product.salePricePiasters ?? item.product.pricePiasters;
          return (
            <article key={item.id} className="min-w-0">
              <Link
                href={`/products/${item.product.slug}`}
                className="relative block aspect-[4/5] bg-stone-200"
              >
                {item.product.imageUrl ? (
                  <Image
                    src={item.product.imageUrl}
                    alt={item.product.imageAlt ?? item.product.name}
                    fill
                    sizes="(max-width: 640px) 50vw, 25vw"
                    className="object-cover"
                  />
                ) : (
                  <span className="absolute inset-0 grid place-items-center px-2 text-center text-[9px] tracking-[0.14em] text-stone-500 uppercase">
                    Image coming soon
                  </span>
                )}
                {!item.product.isAvailable || item.product.stockQuantity === 0 ? (
                  <span className="absolute top-3 left-3 bg-stone-950 px-2.5 py-1 text-[9px] tracking-[0.14em] text-white uppercase">
                    Unavailable
                  </span>
                ) : null}
              </Link>
              <div className="pt-4">
                <div className="flex justify-between gap-4">
                  <div className="min-w-0">
                    <Link
                      href={`/products/${item.product.slug}`}
                      className="block truncate text-sm"
                    >
                      {item.product.name}
                    </Link>
                    <p className="mt-1 text-xs text-stone-500">{item.product.brandName}</p>
                  </div>
                  <p className="shrink-0 text-sm">{formatEgp(price)}</p>
                </div>
                <div className="mt-5 flex gap-2">
                  <Link
                    href={`/products/${item.product.slug}`}
                    className="grid min-h-11 flex-1 place-items-center bg-stone-950 px-3 text-[10px] tracking-[0.12em] text-white uppercase"
                  >
                    Choose options
                  </Link>
                  <button
                    data-analytics-custom="remove-from-wishlist"
                    type="button"
                    disabled={toggle.isPending}
                    className="min-h-11 border border-stone-300 px-3 text-[10px] tracking-[0.12em] uppercase disabled:opacity-50"
                    onClick={() =>
                      toggle.mutate(
                        { productId: item.product.id, saved: true },
                        {
                          onSuccess: () =>
                            void captureAnalyticsEvent('remove_from_wishlist', {
                              product_id: item.product.id,
                              product_name: item.product.name,
                              currency: 'EGP',
                            }),
                        },
                      )
                    }
                  >
                    Remove
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      {toggle.error ? (
        <p className="mt-6 text-sm text-red-700" role="alert">
          {errorMessage(toggle.error)}
        </p>
      ) : null}
    </div>
  );
}
