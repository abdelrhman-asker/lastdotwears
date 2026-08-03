import type { Metadata } from 'next';
import { OrderDetailPanel } from '@/components/admin/order-detail-panel';
export const metadata: Metadata = { title: 'Admin order detail' };
export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OrderDetailPanel id={id} />;
}
