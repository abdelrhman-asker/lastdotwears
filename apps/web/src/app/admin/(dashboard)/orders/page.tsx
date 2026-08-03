import type { Metadata } from 'next';
import { OrdersPanel } from '@/components/admin/orders-panel';
export const metadata: Metadata = { title: 'Admin orders' };
export default function AdminOrdersPage() {
  return <OrdersPanel />;
}
