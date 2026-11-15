import type { MetadataRoute } from 'next';

import { canonicalSiteOrigin, canonicalUrl } from '@/lib/seo/canonical';

export default function robots(): MetadataRoute.Robots {
  const production = process.env.NODE_ENV === 'production';
  return {
    rules: production
      ? { userAgent: '*', allow: '/', disallow: ['/admin/', '/account/'] }
      : { userAgent: '*', disallow: '/' },
    sitemap: canonicalUrl('/sitemap.xml'),
    host: canonicalSiteOrigin,
  };
}
