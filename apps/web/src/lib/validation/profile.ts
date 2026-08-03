import { z } from 'zod';

const namePattern = /^[\p{L}\p{M}][\p{L}\p{M}' -]*$/u;
const egyptianMobilePattern = /^(?:\+20|0)?1[0125]\d{8}$/;

export const profileSchema = z.object({
  firstName: z.string().trim().min(1, 'Enter your first name.').max(80).regex(namePattern),
  lastName: z.string().trim().min(1, 'Enter your last name.').max(80).regex(namePattern),
  phone: z
    .string()
    .trim()
    .refine((value) => value === '' || egyptianMobilePattern.test(value), {
      message: 'Enter a valid Egyptian mobile number.',
    }),
});

export type ProfileInput = z.infer<typeof profileSchema>;
