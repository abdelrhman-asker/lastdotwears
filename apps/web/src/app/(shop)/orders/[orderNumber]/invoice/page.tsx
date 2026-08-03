import type { Metadata } from 'next';

import { InvoicePage } from '@/components/storefront/invoice-page';

export const metadata: Metadata = { title: 'Invoice', robots: { index: false, follow: false } };

export default async function InvoiceRoute({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  return <InvoicePage orderNumber={orderNumber} />;
}
