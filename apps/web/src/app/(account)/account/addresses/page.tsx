import type { Metadata } from 'next';

import { AddressBookPage } from '@/components/account/address-book-page';

export const metadata: Metadata = { title: 'My addresses' };

export default function AddressesPage() {
  return <AddressBookPage />;
}
