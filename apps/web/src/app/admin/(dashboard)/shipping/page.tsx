import type { Metadata } from 'next';
import { ShippingPanel } from '@/components/admin/shipping-panel';
export const metadata: Metadata = { title: 'Admin shipping' };
export default function ShippingPage() {
  return <ShippingPanel />;
}
