import type { Metadata } from 'next';

import { OrderHistoryPanel } from '@/components/account/order-history-panel';

export const metadata: Metadata = { title: 'Order history' };

export default function OrdersPage() {
  return <OrderHistoryPanel />;
}
