'use client';

import Link from 'next/link';

import { useCart, useWishlist } from '@/hooks/use-commerce';

import { BagIcon, HeartIcon } from './icons';

export function CommerceHeaderActions() {
  const cart = useCart();
  const wishlist = useWishlist();

  return (
    <>
      <CountedLink
        href="/wishlist"
        label={`Wishlist${wishlist.data?.itemCount ? `, ${wishlist.data.itemCount} items` : ''}`}
        count={wishlist.data?.itemCount ?? 0}
      >
        <HeartIcon className="size-5" />
      </CountedLink>
      <CountedLink
        href="/cart"
        label={`Shopping bag${cart.data?.itemCount ? `, ${cart.data.itemCount} items` : ''}`}
        count={cart.data?.itemCount ?? 0}
      >
        <BagIcon className="size-5" />
      </CountedLink>
    </>
  );
}

function CountedLink({
  href,
  label,
  count,
  children,
}: {
  href: string;
  label: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="relative grid size-8 lg:size-11 place-items-center"
    >
      {children}
      {count > 0 ? (
        <span className="absolute top-1.5 right-0 grid min-w-4 place-items-center rounded-full bg-stone-950 px-1 text-[9px] leading-4 text-white">
          {Math.min(count, 99)}
        </span>
      ) : null}
    </Link>
  );
}
