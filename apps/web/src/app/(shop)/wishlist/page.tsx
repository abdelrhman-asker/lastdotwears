import type { Metadata } from 'next';

import { WishlistPage } from '@/components/storefront/wishlist-page';

export const metadata: Metadata = {
  title: 'Wishlist',
  description: 'Return to the Last-Dot Wears pieces you saved for later.',
  alternates: { canonical: '/wishlist' },
  robots: { index: false, follow: false },
};

export default function WishlistRoute() {
  return <WishlistPage />;
}
