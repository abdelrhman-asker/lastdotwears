export const canonicalSiteOrigin = 'https://www.last-dot.com';

export function canonicalUrl(path = '/'): string {
  return new URL(path, `${canonicalSiteOrigin}/`).toString();
}
