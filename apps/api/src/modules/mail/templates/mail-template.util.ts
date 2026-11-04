const egpFormatter = new Intl.NumberFormat('en-EG', {
  style: 'currency',
  currency: 'EGP',
});

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll(String.fromCharCode(34), '&quot;')
    .replaceAll(String.fromCharCode(39), '&#039;');
}

export function formatEgp(piasters: number): string {
  return egpFormatter.format(piasters / 100);
}

export function humanize(value: string): string {
  return value.replaceAll('_', ' ').toLowerCase();
}
