const egpFormatter = new Intl.NumberFormat('en-EG', {
  style: 'currency',
  currency: 'EGP',
  currencyDisplay: 'code',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatEgp(piasters: number): string {
  return egpFormatter.format(piasters / 100).replace(/^EGP\s*/u, 'EGP ');
}

export function discountPercentage(pricePiasters: number, salePricePiasters: number): number {
  return Math.round(((pricePiasters - salePricePiasters) / pricePiasters) * 100);
}
