import type { Metadata } from 'next';

import { CustomersPanel } from '@/components/admin/customers-panel';

export const metadata: Metadata = {
  title: 'Customers — Administration',
  robots: { index: false, follow: false },
};

export default function CustomersPage() {
  return <CustomersPanel />;
}
