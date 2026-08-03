import { z } from 'zod';

const namePattern = /^[\p{L}\p{M}][\p{L}\p{M}' -]*$/u;
const egyptianMobilePattern = /^(?:\+20|0)?1[0125]\d{8}$/;

export const addressSchema = z.object({
  label: z.string().trim().min(1, 'Enter a label such as Home.').max(80),
  recipientFirstName: z
    .string()
    .trim()
    .min(1, 'Enter the recipient first name.')
    .max(80)
    .regex(namePattern, 'Enter a valid first name.'),
  recipientLastName: z
    .string()
    .trim()
    .min(1, 'Enter the recipient last name.')
    .max(80)
    .regex(namePattern, 'Enter a valid last name.'),
  phone: z.string().trim().regex(egyptianMobilePattern, 'Enter a valid Egyptian mobile number.'),
  governorateCode: z.string().min(1, 'Choose a governorate.'),
  city: z.string().trim().min(2, 'Enter the city or district.').max(120),
  addressLine1: z.string().trim().min(5, 'Enter the delivery address.').max(250),
  addressLine2: z.string().trim().max(250),
  postalCode: z
    .string()
    .trim()
    .max(20)
    .refine((value) => value === '' || /^[A-Za-z0-9 -]{2,20}$/u.test(value), {
      message: 'Enter a valid postal code.',
    }),
  deliveryNotes: z.string().trim().max(1_000),
  isDefault: z.boolean(),
});

export type AddressFormInput = z.infer<typeof addressSchema>;
