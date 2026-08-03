import type { Metadata } from 'next';
import { TaxonomyPanel } from '@/components/admin/taxonomy-panel';
export const metadata: Metadata = { title: 'Brands — Administration', robots: { index: false } };
export default function BrandsPage() {
  return <TaxonomyPanel kind="brands" />;
}
