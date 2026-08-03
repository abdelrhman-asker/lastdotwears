'use client';

import Link from 'next/link';

export default function ShopError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="grid min-h-[65vh] place-items-center px-6 py-24 text-center">
      <div className="max-w-md">
        <p className="text-[11px] tracking-[0.22em] text-stone-500 uppercase">
          Temporary interruption
        </p>
        <h1 className="mt-5 font-serif text-4xl tracking-tight">
          The collection is taking a moment.
        </h1>
        <p className="mt-4 text-sm leading-6 text-stone-600">
          We could not reach the catalog. Please try again, or return to the home page.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="bg-stone-950 px-6 py-3 text-sm text-white"
          >
            Try again
          </button>
          <Link href="/" className="border border-stone-400 px-6 py-3 text-sm">
            Home
          </Link>
        </div>
      </div>
    </section>
  );
}
