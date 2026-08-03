import { z } from 'zod';

const optionalText = z
  .string()
  .trim()
  .transform((value) => value || undefined)
  .optional();

export const contactSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name.').max(160),
  email: z.email('Enter a valid email address.').max(254),
  phone: optionalText.refine(
    (value) => !value || /^\+?[0-9 ()-]{7,20}$/.test(value),
    'Enter a valid phone number.',
  ),
  orderNumber: optionalText.refine(
    (value) => !value || /^[A-Za-z0-9-]{4,32}$/.test(value),
    'Enter a valid order number.',
  ),
  subject: z.string().trim().min(3, 'Tell us what this is about.').max(160),
  message: z.string().trim().min(10, 'Please add a little more detail.').max(3000),
});

export type ContactInput = z.infer<typeof contactSchema>;
