export const canonicalSiteOrigin = 'https://last-dot.com';

export function canonicalUrl(path = '/'): string {
  return new URL(path, `${canonicalSiteOrigin}/`).toString();
}
