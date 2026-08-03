import { describe, expect, it } from 'vitest';

import { nextOrderStatuses } from '@/lib/admin/order-transitions';

describe('admin order transition presentation', () => {
  it('does not allow manual processing before InstaPay confirmation', () => {
    expect(nextOrderStatuses('WAITING_FOR_PAYMENT')).toEqual(['CANCELLED']);
  });

  it('offers fulfilment and cancellation after payment', () => {
    expect(nextOrderStatuses('PAID')).toEqual(['PROCESSING', 'CANCELLED', 'REFUNDED']);
  });

  it('keeps terminal order states closed', () => {
    expect(nextOrderStatuses('CANCELLED')).toEqual([]);
    expect(nextOrderStatuses('REFUNDED')).toEqual([]);
  });
});
