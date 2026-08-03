import { z } from 'zod';

const namePattern = /^[\p{L}\p{M}][\p{L}\p{M}' -]*$/u;
const egyptianMobilePattern = /^(?:\+20|0)?1[0125]\d{8}$/;
const strongPasswordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/;

const email = z
  .email('Enter a valid email address.')
  .max(254)
  .transform((value) => value.toLowerCase());
const password = z
  .string()
  .min(12, 'Use at least 12 characters.')
  .max(128)
  .regex(strongPasswordPattern, 'Include uppercase, lowercase, number, and symbol characters.');

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password.').max(128),
});

export const registerSchema = z
  .object({
    firstName: z.string().trim().min(1, 'Enter your first name.').max(80).regex(namePattern),
    lastName: z.string().trim().min(1, 'Enter your last name.').max(80).regex(namePattern),
    email,
    phone: z
      .string()
      .trim()
      .refine((value) => value === '' || egyptianMobilePattern.test(value), {
        message: 'Enter a valid Egyptian mobile number.',
      }),
    password,
    confirmPassword: z.string(),
  })
  .refine((input) => input.password === input.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export const emailRequestSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({
    token: z.string().min(32),
    password,
    confirmPassword: z.string(),
  })
  .refine((input) => input.password === input.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterFormInput = z.infer<typeof registerSchema>;
export type RegisterInput = Omit<RegisterFormInput, 'confirmPassword' | 'phone'> & {
  phone?: string;
};
export type EmailRequestInput = z.infer<typeof emailRequestSchema>;
export type ResetPasswordFormInput = z.infer<typeof resetPasswordSchema>;
export type ResetPasswordInput = Pick<ResetPasswordFormInput, 'token' | 'password'>;
