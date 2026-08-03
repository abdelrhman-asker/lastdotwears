import type { Metadata } from 'next';
import Link from 'next/link';

import { ArrowIcon } from '@/components/storefront/icons';

export const metadata: Metadata = {
  title: 'About',
  description: 'Our approach to considered clothing for modern life in Egypt.',
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return (
    <>
      <section className="mx-auto grid min-h-[70vh] max-w-[1600px] items-end gap-12 px-6 py-16 sm:px-8 lg:grid-cols-2 lg:px-12 lg:py-24">
        <div>
          <p className="text-[10px] tracking-[0.24em] text-stone-500 uppercase">
            About Last-Dot Wears
          </p>
          <h1 className="mt-5 max-w-3xl font-serif text-[clamp(4rem,8vw,8.5rem)] leading-[0.85] tracking-[-0.06em]">
            Clothes for real days.
          </h1>
        </div>
        <div className="max-w-lg pb-2 lg:justify-self-end">
          <p className="font-serif text-2xl leading-snug">
            We believe getting dressed should feel clear, useful, and personal.
          </p>
          <p className="mt-6 text-sm leading-7 text-stone-600">
            Last-Dot Wears brings together relaxed tailoring, dependable layers, and thoughtful
            accessories for life in Egypt. Our collection favors clean proportion, comfortable
            fabric, and a neutral palette that makes each piece easier to wear.
          </p>
        </div>
      </section>

      <section className="bg-[#d8c9b4] px-6 py-24 sm:px-8 lg:px-12 lg:py-36">
        <div className="mx-auto grid max-w-[1400px] gap-12 lg:grid-cols-[0.7fr_1.3fr]">
          <p className="text-[10px] tracking-[0.22em] text-stone-600 uppercase">Our approach</p>
          <p className="font-serif text-4xl leading-[1.08] tracking-[-0.035em] sm:text-5xl lg:text-6xl">
            A smaller wardrobe can do more when every piece has a reason to be there.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="grid gap-px bg-stone-300 md:grid-cols-3">
          <Principle number="01" title="Useful by design">
            Silhouettes should move easily between work, weekends, and everything in between.
          </Principle>
          <Principle number="02" title="Quietly distinctive">
            Detail matters most when it improves fit, feel, or the way a garment works with the
            rest.
          </Principle>
          <Principle number="03" title="Made to combine">
            A restrained palette helps new pieces sit naturally alongside what you already own.
          </Principle>
        </div>
        <Link
          href="/products"
          className="group mx-auto mt-14 flex w-fit items-center gap-4 border-b border-stone-950 pb-1 text-sm"
        >
          Explore the collection
          <ArrowIcon className="size-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </section>
    </>
  );
}

function Principle({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: string;
}) {
  return (
    <article className="min-h-72 bg-[#f7f5f1] p-7 lg:p-10">
      <p className="text-[10px] tracking-[0.18em] text-stone-400">{number}</p>
      <h2 className="mt-16 font-serif text-3xl tracking-tight">{title}</h2>
      <p className="mt-4 text-sm leading-6 text-stone-600">{children}</p>
    </article>
  );
}
