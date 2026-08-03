import type { Metadata } from 'next';

import { CheckoutPage } from '@/components/storefront/checkout-page';
import { getPublicWebsiteSettings } from '@/lib/api/storefront';

export const metadata: Metadata = {
  title: 'Checkout',
  description: 'Complete delivery and payment for your order.',
  robots: { index: false, follow: false },
};

export default async function CheckoutRoute() {
  const settings = await getPublicWebsiteSettings();
  return (
    <CheckoutPage
      cashOnDeliveryEnabled={settings.cashOnDeliveryEnabled}
      instaPayEnabled={settings.instaPayEnabled}
    />
  );
}
