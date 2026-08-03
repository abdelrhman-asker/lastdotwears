import { z } from 'zod';

export const productSortValues = [
  'newest',
  'oldest',
  'price-asc',
  'price-desc',
  'name-asc',
] as const;

export type ProductSort = (typeof productSortValues)[number];
export type StorefrontSearchParams = Record<string, string | string[] | undefined>;

export interface ProductListingQuery {
  page: number;
  q?: string;
  category?: string;
  brand?: string;
  size?: string;
  color?: string;
  min?: number;
  max?: number;
  featured?: boolean;
  newArrival?: boolean;
  sort: ProductSort;
}

const shortText = z.string().trim().max(120);
const slug = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u)
  .max(140);
const page = z.coerce.number().int().min(1).max(10_000);
const money = z.coerce.number().int().min(0).max(100_000_000);
const sort = z.enum(productSortValues);

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function optional<T>(schema: z.ZodType<T>, value: string | undefined): T | undefined {
  if (!value) return undefined;
  const parsed = schema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

export function parseProductListingQuery(input: StorefrontSearchParams): ProductListingQuery {
  const parsedPage = page.safeParse(first(input.page));
  const parsedSort = sort.safeParse(first(input.sort));
  const featured = first(input.featured);
  const newArrival = first(input.newArrival);
  return {
    page: parsedPage.success ? parsedPage.data : 1,
    sort: parsedSort.success ? parsedSort.data : 'newest',
    ...(optional(shortText, first(input.q)) ? { q: optional(shortText, first(input.q)) } : {}),
    ...(optional(slug, first(input.category))
      ? { category: optional(slug, first(input.category)) }
      : {}),
    ...(optional(slug, first(input.brand)) ? { brand: optional(slug, first(input.brand)) } : {}),
    ...(optional(shortText, first(input.size))
      ? { size: optional(shortText, first(input.size)) }
      : {}),
    ...(optional(shortText, first(input.color))
      ? { color: optional(shortText, first(input.color)) }
      : {}),
    ...(optional(money, first(input.min)) !== undefined
      ? { min: optional(money, first(input.min)) }
      : {}),
    ...(optional(money, first(input.max)) !== undefined
      ? { max: optional(money, first(input.max)) }
      : {}),
    ...(featured === 'true' ? { featured: true } : {}),
    ...(newArrival === 'true' ? { newArrival: true } : {}),
  };
}

export function toProductApiQuery(query: ProductListingQuery, limit = 24): string {
  const parameters = new URLSearchParams({
    page: String(query.page),
    limit: String(limit),
    sort: query.sort,
  });
  if (query.q) parameters.set('search', query.q);
  if (query.category) parameters.set('category', query.category);
  if (query.brand) parameters.set('brand', query.brand);
  if (query.size) parameters.set('size', query.size);
  if (query.color) parameters.set('color', query.color);
  if (query.min !== undefined) parameters.set('minPrice', String(query.min * 100));
  if (query.max !== undefined) parameters.set('maxPrice', String(query.max * 100));
  if (query.featured) parameters.set('featured', 'true');
  if (query.newArrival) parameters.set('newArrival', 'true');
  return parameters.toString();
}

export function listingHref(pathname: string, query: ProductListingQuery): string {
  const parameters = new URLSearchParams();
  if (query.page > 1) parameters.set('page', String(query.page));
  if (query.q) parameters.set('q', query.q);
  if (query.category) parameters.set('category', query.category);
  if (query.brand) parameters.set('brand', query.brand);
  if (query.size) parameters.set('size', query.size);
  if (query.color) parameters.set('color', query.color);
  if (query.min !== undefined) parameters.set('min', String(query.min));
  if (query.max !== undefined) parameters.set('max', String(query.max));
  if (query.featured) parameters.set('featured', 'true');
  if (query.newArrival) parameters.set('newArrival', 'true');
  if (query.sort !== 'newest') parameters.set('sort', query.sort);
  const serialized = parameters.toString();
  return serialized ? `${pathname}?${serialized}` : pathname;
}
