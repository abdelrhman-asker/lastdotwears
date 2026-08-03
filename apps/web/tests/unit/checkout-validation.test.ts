import { describe, expect, it } from 'vitest';

import { checkoutSchema } from '@/lib/validation/checkout';

const validCheckout = {
  customerFirstName: 'Mariam',
  customerLastName: 'Hassan',
  customerEmail: 'mariam@example.com',
  customerPhone: '01012345678',
  governorateCode: 'cairo',
  shippingCity: 'Nasr City',
  shippingAddressLine1: '12 Example Street',
  shippingAddressLine2: '',
  shippingPostalCode: '',
  deliveryNotes: '',
  paymentMethod: 'INSTAPAY' as const,
};

describe('checkout validation', () => {
  it('accepts an Egyptian delivery address and manual InstaPay', () => {
    expect(checkoutSchema.safeParse(validCheckout).success).toBe(true);
  });

  it('rejects non-Egyptian mobile numbers', () => {
    expect(
      checkoutSchema.safeParse({ ...validCheckout, customerPhone: '+12025550123' }).success,
    ).toBe(false);
  });

  it('requires a governorate and a meaningful street address', () => {
    const result = checkoutSchema.safeParse({
      ...validCheckout,
      governorateCode: '',
      shippingAddressLine1: 'x',
    });
    expect(result.success).toBe(false);
  });
});
