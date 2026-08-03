import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { clientEnvironment } from '@/lib/env/client';
import { AppProviders } from '@/providers/app-providers';
import '@/styles/globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(clientEnvironment.NEXT_PUBLIC_SITE_URL),
  title: {
    default: 'Last-Dot Wears — Modern Clothing in Egypt',
    template: '%s | Last-Dot Wears',
  },
  description:
    'Considered everyday clothing, modern silhouettes, and accessories delivered across Egypt.',
  applicationName: 'Last-Dot Wears',
  keywords: ['fashion Egypt', 'clothing Egypt', 'modern essentials', 'Cairo fashion'],
  category: 'shopping',
  openGraph: {
    type: 'website',
    locale: 'en_EG',
    siteName: 'Last-Dot Wears',
    title: 'Last-Dot Wears — Modern Clothing in Egypt',
    description:
      'Considered everyday clothing, modern silhouettes, and accessories delivered across Egypt.',
    images: [{ url: '/images/editorial-hero.png', width: 1792, height: 887 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Last-Dot Wears — Modern Clothing in Egypt',
    description: 'Considered everyday clothing, designed for life in Egypt.',
    images: ['/images/editorial-hero.png'],
  },
  robots: {
    index: process.env.NODE_ENV === 'production',
    follow: process.env.NODE_ENV === 'production',
  },
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en-EG">
      <body>
        <a
          href="#main-content"
          className="fixed top-3 left-3 z-[100] -translate-y-20 bg-stone-950 px-4 py-3 text-sm text-white transition-transform focus:translate-y-0"
        >
          Skip to content
        </a>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
