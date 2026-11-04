import type { Metadata } from 'next';
import Link from 'next/link';

import { CatalogUnavailable } from '@/components/storefront/catalog-unavailable';
import { FashionHero } from '@/components/storefront/fashion-hero';
import { ArrowIcon } from '@/components/storefront/icons';
import { ProductGrid } from '@/components/storefront/product-grid';
import { SectionHeading } from '@/components/storefront/section-heading';
import { getPublicWebsiteSettings, safeHomeCatalog } from '@/lib/api/storefront';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

export default async function HomePage() {
  const [catalog, settings] = await Promise.all([safeHomeCatalog(), getPublicWebsiteSettings()]);
  const railProducts = [...catalog.featured, ...catalog.newArrivals].filter(
    (product, index, products) =>
      products.findIndex((candidate) => candidate.id === product.id) === index,
  );
  const announcement =
    settings.announcementEnabled && settings.announcementText
      ? settings.announcementText
      : 'Delivery across Egypt';

  return (
    <>
      <FashionHero
        products={railProducts}
        storeName={settings.storeName}
        announcement={announcement}
        unavailable={catalog.unavailable}
      />

      <section className="mx-auto max-w-[1600px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <SectionHeading eyebrow="Explore" title="Shop by category" href="/categories" />
        {catalog.unavailable ? (
          <CatalogUnavailable />
        ) : (
          <div className="grid gap-px bg-stone-300 md:grid-cols-3">
            {catalog.categories.slice(0, 3).map((category, index) => (
              <Link
                key={category.id}
                href={`/categories/${category.slug}`}
                className="group relative flex min-h-72 flex-col justify-between overflow-hidden bg-[#e9e4da] p-7 transition-colors hover:bg-[#ded6c8] lg:min-h-96 lg:p-9"
              >
                <span className="text-[10px] tracking-[0.2em] text-stone-500 uppercase">
                  0{index + 1} / {String(category.productCount).padStart(2, '0')} pieces
                </span>
                <div>
                  <h3 className="font-serif text-4xl tracking-[-0.04em] lg:text-5xl">
                    {category.name}
                  </h3>
                  <div className="mt-5 flex items-center gap-3 text-xs tracking-[0.14em] uppercase">
                    Discover
                    <ArrowIcon className="size-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
                <span
                  aria-hidden="true"
                  className="absolute -top-4 -right-1 font-serif text-[10rem] leading-none text-stone-950/[0.035] lg:text-[14rem]"
                >
                  {index + 1}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="bg-[#eeebe5]">
        <div className="mx-auto max-w-[1600px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
          <SectionHeading
            eyebrow="Selected for now"
            title="The current edit"
            href="/products?featured=true"
          />
          {catalog.unavailable ? (
            <CatalogUnavailable />
          ) : (
            <ProductGrid
              products={catalog.featured}
              emptyMessage="The next edit is being prepared."
            />
          )}
        </div>
      </section>

      <section className="grid bg-stone-950 text-white lg:grid-cols-2">
        <div className="flex min-h-[480px] flex-col justify-between p-8 sm:p-12 lg:min-h-[650px] lg:p-16">
          <p className="text-[10px] tracking-[0.24em] text-stone-400 uppercase">
            Our point of view
          </p>
          <div className="max-w-xl">
            <p className="font-serif text-5xl leading-[0.98] tracking-[-0.04em] sm:text-6xl">
              Fewer pieces.
              <br />
              Better combinations.
            </p>
            <p className="mt-7 max-w-md text-sm leading-6 text-stone-400">
              A considered wardrobe starts with uncomplicated silhouettes, useful fabrics, and
              colors that live well together.
            </p>
            <Link
              href="/about"
              className="mt-8 inline-flex items-center gap-3 border-b border-stone-500 pb-1 text-sm"
            >
              Read our approach <ArrowIcon className="size-4" />
            </Link>
          </div>
        </div>
        <div className="grid min-h-[480px] place-items-center bg-[#c6b8a3] p-10 text-stone-900 lg:min-h-[650px]">
          <div className="aspect-square w-full max-w-md border border-stone-900/30 p-7 sm:p-10">
            <div className="flex h-full flex-col items-center justify-center rounded-full border border-stone-900/40 text-center">
              <p className="text-[10px] tracking-[0.25em] uppercase">Designed around</p>
              <p className="mt-4 font-serif text-5xl tracking-[-0.05em]">Everyday</p>
              <p className="mt-3 text-xs text-stone-700">Form · Fabric · Function</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1600px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <SectionHeading eyebrow="Just in" title="New arrivals" href="/products?newArrival=true" />
        {catalog.unavailable ? (
          <CatalogUnavailable />
        ) : (
          <ProductGrid products={catalog.newArrivals} emptyMessage="New pieces are on their way." />
        )}
      </section>

      <section className="border-t border-stone-300">
        <div className="mx-auto grid max-w-[1600px] divide-y divide-stone-300 px-5 sm:px-8 md:grid-cols-3 md:divide-x md:divide-y-0 lg:px-12">
          <ServiceNote
            number="01"
            title="Delivery across Egypt"
            text="Clear shipping fees before you order."
          />
          <ServiceNote
            number="02"
            title="Simple ways to pay"
            text="Cash on delivery or manual InstaPay."
          />
          <ServiceNote number="03" title="Human support" text="Customer care when you need it." />
        </div>
      </section>
    </>
  );
}

function ServiceNote({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <div className="py-10 md:px-8 md:first:pl-0 md:last:pr-0 lg:py-14">
      <p className="text-[10px] tracking-[0.18em] text-stone-400">{number}</p>
      <h2 className="mt-4 font-serif text-2xl tracking-tight">{title}</h2>
      <p className="mt-2 text-sm text-stone-500">{text}</p>
    </div>
  );
}
