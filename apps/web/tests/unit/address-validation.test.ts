import { describe, expect, it } from 'vitest';

import { addressSchema } from '@/lib/validation/address';

const validAddress = {
  label: 'Home',
  recipientFirstName: 'Mariam',
  recipientLastName: 'Hassan',
  phone: '01012345678',
  governorateCode: 'cairo',
  city: 'Nasr City',
  addressLine1: '12 Example Street',
  addressLine2: '',
  postalCode: '11765',
  deliveryNotes: '',
  isDefault: true,
};

describe('saved address validation', () => {
  it('accepts a complete Egyptian delivery address', () => {
    expect(addressSchema.safeParse(validAddress).success).toBe(true);
  });

  it('rejects non-Egyptian mobile numbers', () => {
    expect(addressSchema.safeParse({ ...validAddress, phone: '+12025550123' }).success).toBe(false);
  });

  it('requires a useful label, governorate, city, and street address', () => {
    const result = addressSchema.safeParse({
      ...validAddress,
      label: '',
      governorateCode: '',
      city: 'x',
      addressLine1: 'x',
    });
    expect(result.success).toBe(false);
  });
});
