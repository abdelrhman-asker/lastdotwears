import type { Metadata } from 'next';
import { ProductCreateForm } from '@/components/admin/product-create-form';
export const metadata: Metadata = {
  title: 'New product — Administration',
  robots: { index: false },
};
export default function NewProductPage() {
  return <ProductCreateForm />;
}
