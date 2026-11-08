'use client';

import Image from 'next/image';
import Link from 'next/link';

import { useCart, useClearCart, useRemoveCartItem, useUpdateCartItem } from '@/hooks/use-commerce';
import { captureAnalyticsEvent } from '@/lib/analytics/client';
import { piastersToEgp } from '@/lib/analytics/events';
import { errorMessage } from '@/lib/api/http-client';
import { formatEgp } from '@/lib/format/currency';
import type { CartItemIssue } from '@/types/commerce';

export function CartPage() {
  const cart = useCart();
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();
  const clear = useClearCart();
  const pending = updateItem.isPending || removeItem.isPending || clear.isPending;
  const mutationError = updateItem.error ?? removeItem.error ?? clear.error;

  if (cart.isPending) return <CartLoading />;
  if (cart.isError) {
    return <CommerceError message={errorMessage(cart.error)} retry={() => void cart.refetch()} />;
  }
  if (!cart.data || cart.data.items.length === 0) return <EmptyCart />;

  return (
    <div className="mx-auto max-w-[1500px] px-5 py-14 sm:px-8 lg:px-12 lg:py-20">
      <header className="flex items-end justify-between border-b border-stone-300 pb-8">
        <div>
          <p className="text-[10px] tracking-[0.22em] text-stone-500 uppercase">Your selection</p>
          <h1 className="mt-4 font-serif text-5xl tracking-[-0.045em] sm:text-6xl">Shopping bag</h1>
        </div>
        <p className="hidden text-sm text-stone-500 sm:block">
          {cart.data.itemCount} {cart.data.itemCount === 1 ? 'item' : 'items'}
        </p>
      </header>

      <div className="mt-10 grid gap-14 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div>
          {cart.data.items.map((item) => (
            <article
              key={item.id}
              className="grid grid-cols-[100px_1fr] gap-5 border-b border-stone-300 py-6 first:pt-0 sm:grid-cols-[150px_1fr] sm:gap-7"
            >
              <Link
                href={`/products/${item.product.slug}`}
                className="relative aspect-[4/5] bg-stone-200"
              >
                {item.product.imageUrl ? (
                  <Image
                    src={item.product.imageUrl}
                    alt={item.product.imageAlt ?? item.product.name}
                    fill
                    sizes="150px"
                    className="object-cover"
                  />
                ) : (
                  <span className="absolute inset-0 grid place-items-center px-2 text-center text-[9px] tracking-[0.14em] text-stone-500 uppercase">
                    Image coming soon
                  </span>
                )}
              </Link>
              <div className="flex min-w-0 flex-col">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[10px] tracking-[0.14em] text-stone-500 uppercase">
                      {item.product.brandName}
                    </p>
                    <Link
                      href={`/products/${item.product.slug}`}
                      className="mt-1 block font-serif text-xl"
                    >
                      {item.product.name}
                    </Link>
                    <p className="mt-2 text-xs text-stone-500">
                      {item.variant.colorName} · {item.variant.size}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm">{formatEgp(item.lineTotalPiasters)}</p>
                </div>

                {item.issue ? (
                  <p className="mt-3 text-xs text-red-700">
                    {issueMessage(item.issue, item.maxQuantity)}
                  </p>
                ) : null}

                <div className="mt-auto flex items-end justify-between gap-4 pt-5">
                  <label>
                    <span className="mb-1.5 block text-[9px] tracking-[0.14em] text-stone-500 uppercase">
                      Quantity
                    </span>
                    <select
                      aria-label={`Quantity for ${item.product.name}`}
                      value={item.quantity}
                      disabled={pending || item.maxQuantity === 0}
                      className="h-10 min-w-17 border border-stone-300 bg-transparent px-2 text-sm disabled:opacity-50"
                      onChange={(event) => {
                        const nextQuantity = Number(event.target.value);
                        const difference = nextQuantity - item.quantity;
                        updateItem.mutate(
                          { variantId: item.variant.id, quantity: nextQuantity },
                          {
                            onSuccess: () => {
                              if (difference === 0) return;
                              void captureAnalyticsEvent(
                                difference > 0 ? 'add_to_cart' : 'remove_from_cart',
                                cartItemAnalytics(item, Math.abs(difference)),
                              );
                            },
                          },
                        );
                      }}
                    >
                      {quantityOptions(item.quantity, item.maxQuantity).map((quantity) => (
                        <option key={quantity} value={quantity}>
                          {quantity}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    data-analytics-custom="remove-from-cart"
                    type="button"
                    disabled={pending}
                    className="border-b border-stone-500 pb-0.5 text-xs text-stone-500 hover:text-stone-950 disabled:opacity-50"
                    onClick={() =>
                      removeItem.mutate(item.variant.id, {
                        onSuccess: () =>
                          void captureAnalyticsEvent(
                            'remove_from_cart',
                            cartItemAnalytics(item, item.quantity),
                          ),
                      })
                    }
                  >
                    Remove
                  </button>
                </div>
              </div>
            </article>
          ))}
          <div className="mt-5 flex justify-end">
            <button
              data-analytics-custom="clear-cart"
              type="button"
              disabled={pending}
              className="text-xs text-stone-500 underline underline-offset-4 disabled:opacity-50"
              onClick={() => {
                if (window.confirm('Remove every item from your shopping bag?')) {
                  const items = cart.data.items;
                  clear.mutate(undefined, {
                    onSuccess: () => {
                      for (const item of items) {
                        void captureAnalyticsEvent(
                          'remove_from_cart',
                          cartItemAnalytics(item, item.quantity),
                        );
                      }
                    },
                  });
                }
              }}
            >
              Clear bag
            </button>
          </div>
          {mutationError ? (
            <p className="mt-4 text-right text-xs text-red-700" role="alert">
              {errorMessage(mutationError)}
            </p>
          ) : null}
        </div>

        <aside className="border border-stone-300 bg-[#eeebe5] p-7 lg:sticky lg:top-28">
          <h2 className="font-serif text-3xl tracking-tight">Order summary</h2>
          <dl className="mt-7 space-y-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt>Subtotal</dt>
              <dd>{formatEgp(cart.data.subtotalPiasters)}</dd>
            </div>
            <div className="flex justify-between gap-4 text-stone-500">
              <dt>Shipping</dt>
              <dd>Calculated at checkout</dd>
            </div>
          </dl>
          <div className="mt-6 flex justify-between border-t border-stone-400 pt-5 font-medium">
            <span>Estimated total</span>
            <span>{formatEgp(cart.data.subtotalPiasters)}</span>
          </div>
          {cart.data.hasUnavailableItems ? (
            <span className="mt-7 grid min-h-13 w-full cursor-not-allowed place-items-center bg-stone-400 px-6 text-xs tracking-[0.15em] text-white uppercase">
              Checkout unavailable
            </span>
          ) : (
            <Link
              href="/checkout"
              className="mt-7 grid min-h-13 w-full place-items-center bg-stone-950 px-6 text-xs tracking-[0.15em] text-white uppercase transition-colors hover:bg-stone-800"
            >
              Checkout
            </Link>
          )}
          {cart.data.hasUnavailableItems ? (
            <p className="mt-5 border-t border-stone-300 pt-5 text-xs leading-5 text-red-700">
              Update or remove unavailable items before checkout.
            </p>
          ) : null}
          <p className="mt-5 border-t border-stone-300 pt-5 text-xs leading-5 text-stone-500">
            Bag items do not reserve stock. Availability is checked again when an order is placed.
          </p>
        </aside>
      </div>
    </div>
  );
}

function EmptyCart() {
  return (
    <section className="grid min-h-[65vh] place-items-center px-6 py-24 text-center">
      <div>
        <p className="text-[10px] tracking-[0.22em] text-stone-500 uppercase">Shopping bag</p>
        <h1 className="mt-5 font-serif text-5xl tracking-[-0.045em]">Your bag is empty.</h1>
        <p className="mt-4 text-sm text-stone-500">
          Explore the collection and choose a piece to begin.
        </p>
        <Link
          href="/products"
          className="mt-8 inline-block bg-stone-950 px-7 py-3.5 text-xs tracking-[0.14em] text-white uppercase"
        >
          Shop the collection
        </Link>
      </div>
    </section>
  );
}

function CartLoading() {
  return (
    <div className="mx-auto min-h-[65vh] max-w-[1500px] animate-pulse px-5 py-16 sm:px-8 lg:px-12">
      <div className="h-14 w-72 bg-stone-200" />
      <div className="mt-12 grid gap-14 lg:grid-cols-[1fr_380px]">
        <div className="h-72 bg-stone-200" />
        <div className="h-80 bg-stone-200" />
      </div>
    </div>
  );
}

function CommerceError({ message, retry }: { message: string; retry: () => void }) {
  return (
    <section className="grid min-h-[65vh] place-items-center px-6 text-center">
      <div>
        <h1 className="font-serif text-4xl">Your bag could not be loaded.</h1>
        <p className="mt-3 text-sm text-stone-500">{message}</p>
        <button
          type="button"
          onClick={retry}
          className="mt-7 bg-stone-950 px-6 py-3 text-sm text-white"
        >
          Try again
        </button>
      </div>
    </section>
  );
}

function issueMessage(issue: CartItemIssue, maxQuantity: number): string {
  if (issue === 'OUT_OF_STOCK') return 'This option is currently out of stock.';
  if (issue === 'INSUFFICIENT_STOCK') return `Only ${maxQuantity} are now available.`;
  return 'This option is no longer available.';
}

function quantityOptions(current: number, maximum: number): number[] {
  const quantities = Array.from({ length: Math.min(99, maximum) }, (_, index) => index + 1);
  if (!quantities.includes(current)) quantities.push(current);
  return quantities.sort((first, second) => first - second);
}

function cartItemAnalytics(item: import('@/types/commerce').CartItem, quantity: number) {
  return {
    product_id: item.product.id,
    product_name: item.product.name,
    sku: item.variant.sku,
    variant_id: item.variant.id,
    price_egp: piastersToEgp(item.unitPricePiasters),
    currency: 'EGP' as const,
    quantity,
  };
}
