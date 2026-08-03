import type { Metadata } from 'next';

import { CartPage } from '@/components/storefront/cart-page';

export const metadata: Metadata = {
  title: 'Shopping bag',
  description: 'Review the pieces in your Last-Dot Wears shopping bag.',
  alternates: { canonical: '/cart' },
  robots: { index: false, follow: false },
};

export default function CartRoute() {
  return <CartPage />;
}
