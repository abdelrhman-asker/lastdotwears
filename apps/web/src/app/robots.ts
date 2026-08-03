import type { MetadataRoute } from 'next';

import { clientEnvironment } from '@/lib/env/client';

export default function robots(): MetadataRoute.Robots {
  const production = process.env.NODE_ENV === 'production';
  return {
    rules: production
      ? { userAgent: '*', allow: '/', disallow: ['/admin/', '/account/'] }
      : { userAgent: '*', disallow: '/' },
    sitemap: `${clientEnvironment.NEXT_PUBLIC_SITE_URL.replace(/\/$/u, '')}/sitemap.xml`,
    host: clientEnvironment.NEXT_PUBLIC_SITE_URL,
  };
}
