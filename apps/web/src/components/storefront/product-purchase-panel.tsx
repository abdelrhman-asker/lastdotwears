'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { useAddCartItem } from '@/hooks/use-commerce';
import { captureAnalyticsEvent } from '@/lib/analytics/client';
import { piastersToEgp } from '@/lib/analytics/events';
import { errorMessage } from '@/lib/api/http-client';
import { formatEgp } from '@/lib/format/currency';
import type { ProductVariant } from '@/types/catalog';

import { WishlistButton } from './wishlist-button';

export function ProductPurchasePanel({
  productId,
  productName,
  categoryName,
  pricePiasters,
  variants,
}: {
  productId: string;
  productName: string;
  categoryName: string;
  pricePiasters: number;
  variants: ProductVariant[];
}) {
  const sellableVariants = variants.filter((variant) => variant.isActive);
  const colors = useMemo(
    () =>
      sellableVariants.filter(
        (variant, index, values) =>
          values.findIndex((candidate) => candidate.colorName === variant.colorName) === index,
      ),
    [sellableVariants],
  );
  const [color, setColor] = useState(colors[0]?.colorName ?? '');
  const [size, setSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState('');
  const addItem = useAddCartItem();
  const sizes = sellableVariants.filter((variant) => variant.colorName === color);
  const selected = sizes.find((variant) => variant.size === size);
  const maxQuantity = selected ? Math.min(99, selected.stockQuantity) : 1;

  return (
    <div className="mt-9 border-t border-stone-300 pt-7">
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] tracking-[0.16em] uppercase">Choose your option</h2>
        <span className="text-xs text-stone-500">
          {sellableVariants.some((variant) => variant.stockQuantity > 0)
            ? 'In stock'
            : 'Out of stock'}
        </span>
      </div>

      <fieldset className="mt-6">
        <legend className="text-[10px] tracking-[0.14em] text-stone-500 uppercase">Color</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {colors.map((variant) => (
            <button
              key={variant.colorName}
              type="button"
              aria-pressed={color === variant.colorName}
              className={`inline-flex min-h-11 items-center gap-2 border px-3 text-sm transition-colors ${
                color === variant.colorName
                  ? 'border-stone-950 bg-stone-950 text-white'
                  : 'border-stone-300 hover:border-stone-700'
              }`}
              onClick={() => {
                setColor(variant.colorName);
                setSize('');
                setQuantity(1);
                setMessage('');
              }}
            >
              <span
                className="size-4 rounded-full border border-stone-400"
                style={{ backgroundColor: variant.colorHex ?? '#d6d3d1' }}
              />
              {variant.colorName}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-6">
        <legend className="text-[10px] tracking-[0.14em] text-stone-500 uppercase">Size</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {sizes.map((variant) => (
            <button
              key={variant.id}
              type="button"
              disabled={variant.stockQuantity <= 0}
              aria-pressed={size === variant.size}
              className={`grid min-h-11 min-w-12 place-items-center border px-3 text-xs transition-colors disabled:cursor-not-allowed disabled:text-stone-400 disabled:line-through ${
                size === variant.size
                  ? 'border-stone-950 bg-stone-950 text-white'
                  : 'border-stone-300 hover:border-stone-700'
              }`}
              onClick={() => {
                setSize(variant.size);
                setQuantity(1);
                setMessage('');
              }}
            >
              {variant.size}
            </button>
          ))}
        </div>
      </fieldset>

      {selected ? (
        <div className="mt-6 flex items-end justify-between gap-6">
          <label className="block">
            <span className="mb-2 block text-[10px] tracking-[0.14em] text-stone-500 uppercase">
              Quantity
            </span>
            <select
              value={quantity}
              onChange={(event) => setQuantity(Number(event.target.value))}
              className="h-11 min-w-20 border border-stone-300 bg-transparent px-3 text-sm"
            >
              {Array.from({ length: maxQuantity }, (_, index) => index + 1).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <div className="text-right text-xs text-stone-500">
            <p>{selected.stockQuantity} available</p>
            {selected.priceOverridePiasters ? (
              <p className="mt-1 text-sm text-stone-950">
                {formatEgp(selected.priceOverridePiasters)}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      <button
        data-analytics-custom="add-to-cart"
        type="button"
        disabled={!selected || selected.stockQuantity <= 0 || addItem.isPending}
        className="mt-7 min-h-13 w-full bg-stone-950 px-6 text-xs tracking-[0.15em] text-white uppercase transition-colors hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400"
        onClick={() => {
          if (!selected) return;
          setMessage('');
          addItem.mutate(
            { variantId: selected.id, quantity },
            {
              onSuccess: () => {
                setMessage('Added to your shopping bag.');
                void captureAnalyticsEvent('add_to_cart', {
                  product_id: productId,
                  product_name: productName,
                  category: categoryName,
                  sku: selected.sku,
                  variant_id: selected.id,
                  price_egp: piastersToEgp(selected.priceOverridePiasters ?? pricePiasters),
                  currency: 'EGP',
                  quantity,
                });
              },
              onError: (error) => setMessage(errorMessage(error)),
            },
          );
        }}
      >
        {addItem.isPending ? 'Adding…' : selected ? 'Add to bag' : 'Select a size'}
      </button>
      <WishlistButton
        productId={productId}
        productName={productName}
        showLabel
        className="mt-2 w-full border border-stone-300 bg-transparent"
      />
      <div className="mt-3 min-h-5 text-center text-xs" aria-live="polite">
        {message ? (
          <p className={addItem.isError ? 'text-red-700' : 'text-stone-600'}>
            {message}{' '}
            {addItem.isSuccess ? (
              <Link href="/cart" className="border-b border-stone-700">
                View bag
              </Link>
            ) : null}
          </p>
        ) : null}
      </div>
    </div>
  );
}
