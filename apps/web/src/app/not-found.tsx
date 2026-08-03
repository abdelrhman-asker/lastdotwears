import Link from 'next/link';

export default function NotFound() {
  return (
    <section className="grid min-h-[65vh] place-items-center bg-stone-50 px-6 text-center text-stone-950">
      <div>
        <p className="text-xs tracking-[0.25em] text-stone-500 uppercase">404</p>
        <h1 className="mt-5 text-4xl font-medium tracking-[-0.04em]">Page not found</h1>
        <Link
          href="/"
          className="mt-8 inline-block border-b border-stone-950 pb-1 text-sm transition-opacity hover:opacity-60"
        >
          Return home
        </Link>
      </div>
    </section>
  );
}
