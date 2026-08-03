import type { ReactNode } from 'react';

import { ShopFooter } from '@/components/storefront/shop-footer';
import { ShopHeader } from '@/components/storefront/shop-header';
import { getPublicWebsiteSettings } from '@/lib/api/storefront';

export default async function ShopLayout({ children }: { children: ReactNode }) {
  const settings = await getPublicWebsiteSettings();
  const paymentMethods = [
    settings.cashOnDeliveryEnabled ? 'Cash on delivery' : null,
    settings.instaPayEnabled ? 'InstaPay' : null,
  ].filter(Boolean);
  const announcement =
    settings.announcementEnabled && settings.announcementText
      ? settings.announcementText
      : `Delivery across Egypt · ${paymentMethods.join(' & ')}`;
  return (
    <div className="min-h-dvh bg-[#f7f5f1] text-stone-950">
      <p className="bg-stone-950 px-5 py-2.5 text-center text-[10px] tracking-[0.18em] text-stone-100 uppercase">
        {announcement}
      </p>
      <ShopHeader storeName={settings.storeName} />
      <main id="main-content">{children}</main>
      <ShopFooter />
    </div>
  );
}
