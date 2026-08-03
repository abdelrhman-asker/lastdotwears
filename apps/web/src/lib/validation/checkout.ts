import { z } from 'zod';

const namePattern = /^[\p{L}\p{M}][\p{L}\p{M}' -]*$/u;
const egyptianMobilePattern = /^(?:\+20|0)?1[0125]\d{8}$/;

export const checkoutSchema = z.object({
  customerFirstName: z.string().trim().min(1, 'Enter your first name.').max(80).regex(namePattern),
  customerLastName: z.string().trim().min(1, 'Enter your last name.').max(80).regex(namePattern),
  customerEmail: z.email('Enter a valid email address.').max(254),
  customerPhone: z
    .string()
    .trim()
    .regex(egyptianMobilePattern, 'Enter a valid Egyptian mobile number.'),
  governorateCode: z.string().min(1, 'Choose a governorate.'),
  shippingCity: z.string().trim().min(2, 'Enter your city or district.').max(120),
  shippingAddressLine1: z.string().trim().min(5, 'Enter the delivery address.').max(250),
  shippingAddressLine2: z.string().trim().max(250),
  shippingPostalCode: z
    .string()
    .trim()
    .max(20)
    .refine((value) => value === '' || /^[A-Za-z0-9 -]{2,20}$/u.test(value), {
      message: 'Enter a valid postal code.',
    }),
  deliveryNotes: z.string().trim().max(1_000),
  paymentMethod: z.enum(['CASH_ON_DELIVERY', 'INSTAPAY']),
});

export type CheckoutFormInput = z.infer<typeof checkoutSchema>;
