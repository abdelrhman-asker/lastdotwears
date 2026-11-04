import { z } from 'zod';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const moneyPattern = /^\d+(?:\.\d{1,2})?$/;

export const taxonomySchema = z.object({
  name: z.string().trim().min(1, 'Enter a name.').max(120),
  slug: z
    .string()
    .trim()
    .refine(
      (value) => value === '' || slugPattern.test(value),
      'Use lowercase letters, numbers, and hyphens.',
    ),
  description: z.string().trim().max(2_000),
  isActive: z.boolean(),
});

export type TaxonomyFormInput = z.infer<typeof taxonomySchema>;

export const productCreateSchema = z
  .object({
    name: z.string().trim().min(1).max(180),
    slug: z
      .string()
      .trim()
      .refine(
        (value) => value === '' || slugPattern.test(value),
        'Use lowercase letters, numbers, and hyphens.',
      ),
    description: z.string().trim().min(1).max(20_000),
    priceEgp: z.string().trim().regex(moneyPattern, 'Enter a valid EGP amount.'),
    salePriceEgp: z
      .string()
      .trim()
      .refine((value) => value === '' || moneyPattern.test(value), 'Enter a valid EGP amount.'),
    categoryId: z.string().uuid('Choose a category.'),
    brandId: z.string().uuid('Choose a brand.'),
    status: z.enum(['DRAFT', 'ACTIVE']),
    isFeatured: z.boolean(),
    isNewArrival: z.boolean(),
    sku: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/),
    size: z.string().trim().min(1).max(40),
    colorName: z.string().trim().min(1).max(80),
    colorHex: z
      .string()
      .trim()
      .regex(/^#[0-9A-Fa-f]{6}$/, 'Use a six-digit hex color.'),
    stockQuantity: z.number().int().min(0),
    lowStockThreshold: z.number().int().min(0),
  })
  .refine(
    (input) => input.salePriceEgp === '' || Number(input.salePriceEgp) < Number(input.priceEgp),
    { message: 'Sale price must be lower than the regular price.', path: ['salePriceEgp'] },
  );

export type ProductCreateFormInput = z.infer<typeof productCreateSchema>;

export const productEditSchema = z
  .object({
    name: z.string().trim().min(1).max(180),
    slug: z.string().trim().regex(slugPattern),
    description: z.string().trim().min(1).max(20_000),
    priceEgp: z.string().trim().regex(moneyPattern),
    salePriceEgp: z
      .string()
      .trim()
      .refine((value) => value === '' || moneyPattern.test(value)),
    categoryId: z.string().uuid(),
    brandId: z.string().uuid(),
    status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']),
    isFeatured: z.boolean(),
    isNewArrival: z.boolean(),
  })
  .refine(
    (input) => input.salePriceEgp === '' || Number(input.salePriceEgp) < Number(input.priceEgp),
    { message: 'Sale price must be lower than the regular price.', path: ['salePriceEgp'] },
  );

export type ProductEditFormInput = z.infer<typeof productEditSchema>;

export const variantSchema = z.object({
  sku: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/),
  size: z.string().trim().min(1).max(40),
  colorName: z.string().trim().min(1).max(80),
  colorHex: z
    .string()
    .trim()
    .regex(/^#[0-9A-Fa-f]{6}$/),
  stockQuantity: z.number().int().min(0),
  lowStockThreshold: z.number().int().min(0),
});

export type VariantFormInput = z.infer<typeof variantSchema>;

export const variantEditSchema = variantSchema
  .omit({ stockQuantity: true })
  .extend({ isActive: z.boolean(), priceOverrideEgp: z.string().trim() })
  .refine((values) => values.priceOverrideEgp === '' || Number(values.priceOverrideEgp) > 0, {
    message: 'Enter a price above zero or leave this empty.',
    path: ['priceOverrideEgp'],
  });

export type VariantEditFormInput = z.infer<typeof variantEditSchema>;

export function egpToPiasters(value: string): number {
  return Math.round(Number(value) * 100);
}
