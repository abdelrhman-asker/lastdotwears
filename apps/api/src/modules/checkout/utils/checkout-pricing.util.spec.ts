import { calculateDiscount, effectiveUnitPrice } from './checkout-pricing.util.js';

describe('checkout pricing', () => {
  it('uses variant override before sale and regular prices', () => {
    expect(
      effectiveUnitPrice({
        priceOverridePiasters: 80_000,
        salePricePiasters: 90_000,
        pricePiasters: 100_000,
      }),
    ).toBe(80_000);
    expect(
      effectiveUnitPrice({
        priceOverridePiasters: null,
        salePricePiasters: 90_000,
        pricePiasters: 100_000,
      }),
    ).toBe(90_000);
  });

  it('rounds percentage discounts down to whole piasters', () => {
    expect(
      calculateDiscount(100_005, {
        discountType: 'PERCENTAGE',
        value: 10,
        maximumDiscountPiasters: null,
      }),
    ).toBe(10_000);
  });

  it('honors a maximum percentage discount', () => {
    expect(
      calculateDiscount(1_000_000, {
        discountType: 'PERCENTAGE',
        value: 20,
        maximumDiscountPiasters: 50_000,
      }),
    ).toBe(50_000);
  });

  it('never discounts more than the merchandise subtotal', () => {
    expect(
      calculateDiscount(40_000, {
        discountType: 'FIXED_AMOUNT',
        value: 80_000,
        maximumDiscountPiasters: null,
      }),
    ).toBe(40_000);
  });
});
