import type { Metadata } from 'next';
import { ProductsPanel } from '@/components/admin/products-panel';
export const metadata: Metadata = { title: 'Products — Administration', robots: { index: false } };
export default function ProductsPage() {
  return <ProductsPanel />;
}
