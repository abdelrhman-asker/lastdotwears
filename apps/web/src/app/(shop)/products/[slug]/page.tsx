import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ProductGrid } from '@/components/storefront/product-grid';
import { ProductPurchasePanel } from '@/components/storefront/product-purchase-panel';
import { SectionHeading } from '@/components/storefront/section-heading';
import { getPublicProduct, listPublicProducts } from '@/lib/api/storefront';
import { discountPercentage, formatEgp } from '@/lib/format/currency';
import { clientEnvironment } from '@/lib/env/client';
import type { Product } from '@/types/catalog';

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const product = await getPublicProduct(slug);
    if (!product) return { title: 'Product not found' };
    const description = product.description.slice(0, 155);
    const image = product.images.find((candidate) => candidate.isPrimary) ?? product.images[0];
    return {
      title: product.name,
      description,
      alternates: { canonical: `/products/${product.slug}` },
      openGraph: {
        title: `${product.name} | Last-Dot Wears`,
        description,
        url: `/products/${product.slug}`,
        ...(image
          ? {
              images: [
                {
                  url: image.secureUrl,
                  width: image.width,
                  height: image.height,
                  alt: image.altText,
                },
              ],
            }
          : {}),
      },
    };
  } catch {
    return { title: 'Product' };
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getPublicProduct(slug);
  if (!product) notFound();

  let related: Product[] = [];
  try {
    const result = await listPublicProducts(
      { page: 1, category: product.category.slug, sort: 'newest' },
      4,
    );
    related = result.items.filter((candidate) => candidate.id !== product.id).slice(0, 3);
  } catch {
    // Related products are non-critical; the product itself remains available.
  }

  const effectivePrice = product.salePricePiasters ?? product.pricePiasters;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    sku: product.variants[0]?.sku,
    brand: { '@type': 'Brand', name: product.brand.name },
    category: product.category.name,
    image: product.images.map((image) => image.secureUrl),
    offers: {
      '@type': 'Offer',
      url: `${clientEnvironment.NEXT_PUBLIC_SITE_URL}/products/${product.slug}`,
      priceCurrency: 'EGP',
      price: (effectivePrice / 100).toFixed(2),
      availability:
        product.stockQuantity > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replaceAll('<', '\\u003c') }}
      />
      <div className="mx-auto max-w-[1600px] px-5 py-7 sm:px-8 lg:px-12">
        <nav
          aria-label="Breadcrumb"
          className="text-[10px] tracking-[0.14em] text-stone-500 uppercase"
        >
          <Link href="/products" className="hover:text-stone-950">
            Shop
          </Link>
          <span aria-hidden="true" className="mx-2">
            /
          </span>
          <Link href={`/categories/${product.category.slug}`} className="hover:text-stone-950">
            {product.category.name}
          </Link>
          <span aria-hidden="true" className="mx-2">
            /
          </span>
          <span className="text-stone-800">{product.name}</span>
        </nav>

        <div className="mt-7 grid gap-10 lg:grid-cols-[minmax(0,1.65fr)_minmax(340px,0.7fr)] lg:gap-14">
          <ProductGallery product={product} />

          <aside className="lg:sticky lg:top-28 lg:self-start">
            <p className="text-[10px] tracking-[0.2em] text-stone-500 uppercase">
              {product.brand.name}
            </p>
            <h1 className="mt-3 font-serif text-4xl leading-tight tracking-[-0.035em] lg:text-5xl">
              {product.name}
            </h1>
            <div className="mt-5 flex items-baseline gap-3">
              <p className="text-lg">{formatEgp(effectivePrice)}</p>
              {product.salePricePiasters ? (
                <>
                  <p className="text-sm text-stone-400 line-through">
                    {formatEgp(product.pricePiasters)}
                  </p>
                  <p className="text-[10px] tracking-[0.14em] text-red-700 uppercase">
                    Save {discountPercentage(product.pricePiasters, product.salePricePiasters)}%
                  </p>
                </>
              ) : null}
            </div>
            <p className="mt-7 whitespace-pre-line text-sm leading-7 text-stone-600">
              {product.description}
            </p>

            <ProductPurchasePanel
              productId={product.id}
              productName={product.name}
              variants={product.variants}
            />

            <div className="mt-8 border-y border-stone-300">
              <ProductNote title="Delivery & payment">
                Delivery is available across Egypt. Pay with cash on delivery or manual InstaPay at
                checkout.
              </ProductNote>
              <ProductNote title="Product reference">
                {product.variants.map((variant) => variant.sku).join(' · ')}
              </ProductNote>
            </div>
          </aside>
        </div>
      </div>

      {related.length > 0 ? (
        <section className="mx-auto max-w-[1600px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
          <SectionHeading title="You may also like" eyebrow="More in this category" />
          <ProductGrid products={related} />
        </section>
      ) : null}
    </>
  );
}

function ProductGallery({ product }: { product: Product }) {
  if (product.images.length === 0) {
    return (
      <div className="grid aspect-[4/5] place-items-center bg-[linear-gradient(145deg,#ebe7df,#d9d2c7)]">
        <span className="text-[10px] tracking-[0.25em] text-stone-500 uppercase">
          Image coming soon
        </span>
      </div>
    );
  }

  return (
    <div className={`grid gap-2 ${product.images.length > 1 ? 'sm:grid-cols-2' : ''}`}>
      {product.images.map((image, index) => (
        <div key={image.id} className="relative aspect-[4/5] overflow-hidden bg-stone-200">
          <Image
            src={image.secureUrl}
            alt={image.altText || product.name}
            fill
            priority={index === 0}
            sizes={
              product.images.length > 1
                ? '(max-width: 640px) 100vw, 45vw'
                : '(max-width: 1024px) 100vw, 62vw'
            }
            className="object-cover"
          />
        </div>
      ))}
    </div>
  );
}

function ProductNote({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="border-b border-stone-300 last:border-b-0">
      <summary className="flex cursor-pointer list-none items-center justify-between py-5 text-xs tracking-[0.12em] uppercase">
        {title}
        <span className="text-lg font-light">+</span>
      </summary>
      <p className="pb-5 text-sm leading-6 text-stone-600">{children}</p>
    </details>
  );
}
