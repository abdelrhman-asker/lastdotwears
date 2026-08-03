import type { Metadata } from 'next';
import { ProductEditor } from '@/components/admin/product-editor';
export const metadata: Metadata = {
  title: 'Edit product — Administration',
  robots: { index: false },
};
export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProductEditor productId={id} />;
}
