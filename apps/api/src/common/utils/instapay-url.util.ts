export function isInstaPayPaymentUrl(value: string): boolean {
  if (!/^https:\/\//iu.test(value) || /[\s\\]/u.test(value)) return false;
  const url = URL.parse(value);
  return url?.hostname === 'ipn.eg' && !url.username && !url.password && !url.port;
}
