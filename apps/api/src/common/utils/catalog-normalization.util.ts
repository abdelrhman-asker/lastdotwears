export const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function createSlug(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200);
}

export function normalizeSku(value: string): string {
  return value.trim().toUpperCase();
}

export function createCombinationKey(size: string, colorName: string): string {
  const normalizePart = (value: string) =>
    value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en');
  return `${normalizePart(size)}::${normalizePart(colorName)}`;
}
