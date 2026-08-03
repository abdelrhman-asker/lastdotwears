import type { Metadata } from 'next';
import { TaxonomyPanel } from '@/components/admin/taxonomy-panel';
export const metadata: Metadata = {
  title: 'Categories — Administration',
  robots: { index: false },
};
export default function CategoriesPage() {
  return <TaxonomyPanel kind="categories" />;
}
