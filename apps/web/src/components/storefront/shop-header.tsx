'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { CommerceHeaderActions } from './commerce-header-actions';
import { CloseIcon, MenuIcon, SearchIcon, UserIcon } from './icons';
import Logo from '../../../public/images/Logo.svg';
import Image from 'next/image';
const navigation = [
  { href: '/products', label: 'Shop' },
  { href: '/products?newArrival=true', label: 'New arrivals' },
  { href: '/categories', label: 'Categories' },
  { href: '/about', label: 'About' },
];

export function ShopHeader({ storeName }: { storeName: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-stone-900/10 bg-[#f7f5f1]/95 backdrop-blur-md print:hidden">
      <div className="mx-auto grid h-18 max-w-[1600px] grid-cols-[1fr_auto_1fr] items-center px-5 sm:px-8 lg:px-12">
        <nav aria-label="Primary" className="hidden items-center gap-7 lg:flex">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-[11px] tracking-[0.16em] text-stone-700 uppercase transition-colors hover:text-stone-950"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          className="flex size-8 lg:size-11 items-center justify-start lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-navigation"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((current) => !current)}
        >
          {open ? <CloseIcon className="size-6" /> : <MenuIcon className="size-6" />}
        </button>

        <Link
          href="/"
          className="text-center text-[13px] font-semibold tracking-[0.3em] whitespace-nowrap uppercase"
          aria-label={`${storeName} home`}
        >
          <Image src={Logo} alt="" width={150} height={80} />
          {/* {storeName} */}
        </Link>

        <div className="flex items-center justify-end gap-0 sm:gap-3">
          <form
            action="/search"
            role="search"
            className="hidden items-center border-b border-stone-400 xl:flex"
          >
            <label htmlFor="header-search" className="sr-only">
              Search products
            </label>
            <input
              id="header-search"
              name="q"
              type="search"
              placeholder="Search"
              maxLength={120}
              className="h-9 w-28 bg-transparent text-xs outline-none placeholder:text-stone-500"
            />
            <button
              type="submit"
              aria-label="Submit search"
              className="grid size-9 place-items-center"
            >
              <SearchIcon className="size-[18px]" />
            </button>
          </form>
          <Link
            href="/search"
            aria-label="Search"
            className="hidden size-8 lg:size-11 place-items-center sm:grid xl:hidden"
          >
            <SearchIcon className="size-5" />
          </Link>
          <Link
            href="/account/profile"
            aria-label="Your account"
            className="hidden size-8 lg:size-11 place-items-center sm:grid"
          >
            <UserIcon className="size-5" />
          </Link>
          <CommerceHeaderActions />
        </div>
      </div>

      {open ? (
        <div
          id="mobile-navigation"
          className="fixed inset-x-0 top-[72px] h-[calc(100dvh-72px)] border-t border-stone-200 bg-[#f7f5f1] px-6 py-8 lg:hidden"
        >
          <form action="/search" role="search" className="flex border-b border-stone-900 pb-2">
            <label htmlFor="mobile-search" className="sr-only">
              Search products
            </label>
            <input
              id="mobile-search"
              name="q"
              type="search"
              placeholder="What are you looking for?"
              maxLength={120}
              className="min-w-0 flex-1 bg-transparent py-2 text-base outline-none placeholder:text-stone-500"
            />
            <button
              type="submit"
              aria-label="Submit search"
              className="grid size-10 place-items-center"
            >
              <SearchIcon className="size-5" />
            </button>
          </form>
          <nav aria-label="Mobile navigation" className="mt-10 flex flex-col">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="border-b border-stone-300 py-5 font-serif text-3xl tracking-tight"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/contact"
              onClick={() => setOpen(false)}
              className="border-b border-stone-300 py-5 font-serif text-3xl tracking-tight"
            >
              Contact
            </Link>
            <Link
              href="/wishlist"
              onClick={() => setOpen(false)}
              className="border-b border-stone-300 py-5 font-serif text-3xl tracking-tight"
            >
              Wishlist
            </Link>
            <Link
              href="/cart"
              onClick={() => setOpen(false)}
              className="border-b border-stone-300 py-5 font-serif text-3xl tracking-tight"
            >
              Shopping bag
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
