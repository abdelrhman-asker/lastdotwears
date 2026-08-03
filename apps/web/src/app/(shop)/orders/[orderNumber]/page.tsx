import type { Metadata } from 'next';

import { OrderConfirmationPage } from '@/components/storefront/order-confirmation-page';

export const metadata: Metadata = {
  title: 'Order confirmation',
  robots: { index: false, follow: false },
};

export default async function OrderPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  return <OrderConfirmationPage orderNumber={orderNumber} />;
}
