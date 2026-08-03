import { describe, expect, it } from 'vitest';

import { loginSchema, registerSchema, resetPasswordSchema } from '@/lib/validation/auth';
import { profileSchema } from '@/lib/validation/profile';

describe('authentication validation', () => {
  it('normalizes valid registration input for an Egyptian customer', () => {
    const result = registerSchema.safeParse({
      firstName: ' Mariam ',
      lastName: 'Hassan',
      email: 'MARIAM@EXAMPLE.COM',
      phone: '01012345678',
      password: 'A-secure-password!42',
      confirmPassword: 'A-secure-password!42',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.firstName).toBe('Mariam');
      expect(result.data.email).toBe('mariam@example.com');
    }
  });

  it('rejects weak and non-matching passwords', () => {
    const result = registerSchema.safeParse({
      firstName: 'Mariam',
      lastName: 'Hassan',
      email: 'mariam@example.com',
      phone: '',
      password: 'password',
      confirmPassword: 'different',
    });

    expect(result.success).toBe(false);
  });

  it('validates login, reset-token, and profile boundaries', () => {
    expect(loginSchema.safeParse({ email: 'bad', password: '' }).success).toBe(false);
    expect(
      resetPasswordSchema.safeParse({
        token: 'short',
        password: 'A-secure-password!42',
        confirmPassword: 'A-secure-password!42',
      }).success,
    ).toBe(false);
    expect(
      profileSchema.safeParse({ firstName: 'Omar', lastName: 'Ali', phone: '01212345678' }).success,
    ).toBe(true);
    expect(
      profileSchema.safeParse({ firstName: 'Omar', lastName: 'Ali', phone: '01123' }).success,
    ).toBe(false);
  });
});
