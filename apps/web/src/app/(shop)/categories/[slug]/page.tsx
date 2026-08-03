import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ProductListing } from '@/components/storefront/product-listing';
import { getPublicCategory } from '@/lib/api/storefront';
import {
  parseProductListingQuery,
  type StorefrontSearchParams,
} from '@/lib/validation/storefront-query';

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<StorefrontSearchParams>;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const category = await getPublicCategory(slug);
    if (!category) return { title: 'Category not found' };
    return {
      title: category.name,
      description:
        category.description ?? `Shop ${category.name.toLowerCase()} from Last-Dot Wears.`,
      alternates: { canonical: `/categories/${category.slug}` },
      openGraph: {
        title: `${category.name} | Last-Dot Wears`,
        description:
          category.description ?? `Shop ${category.name.toLowerCase()} from Last-Dot Wears.`,
        url: `/categories/${category.slug}`,
      },
    };
  } catch {
    return { title: 'Collection' };
  }
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const [{ slug }, rawQuery] = await Promise.all([params, searchParams]);
  const category = await getPublicCategory(slug);
  if (!category) notFound();
  const query = { ...parseProductListingQuery(rawQuery), category: category.slug };

  return (
    <ProductListing
      action={`/categories/${category.slug}`}
      query={query}
      title={category.name}
      eyebrow="Category"
      description={category.description}
      lockedCategory={category.slug}
    />
  );
}
