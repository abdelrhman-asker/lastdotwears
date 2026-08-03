import { describe, expect, it } from 'vitest';

import { contactSchema } from '@/lib/validation/contact';

describe('contactSchema', () => {
  it('normalizes blank optional fields', () => {
    expect(
      contactSchema.parse({
        name: 'Mariam Hassan',
        email: 'mariam@example.com',
        phone: ' ',
        orderNumber: '',
        subject: 'Sizing help',
        message: 'Could you help me choose the right size?',
      }),
    ).toMatchObject({ phone: undefined, orderNumber: undefined });
  });

  it('rejects malformed order references and short messages', () => {
    expect(
      contactSchema.safeParse({
        name: 'Mariam Hassan',
        email: 'mariam@example.com',
        orderNumber: '<script>',
        subject: 'Help',
        message: 'Short',
      }).success,
    ).toBe(false);
  });
});
