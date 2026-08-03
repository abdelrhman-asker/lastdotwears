export interface DiscountableCoupon {
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  value: number;
  maximumDiscountPiasters: number | null;
}

export function effectiveUnitPrice(input: {
  priceOverridePiasters: number | null;
  salePricePiasters: number | null;
  pricePiasters: number;
}): number {
  return input.priceOverridePiasters ?? input.salePricePiasters ?? input.pricePiasters;
}

export function calculateDiscount(subtotalPiasters: number, coupon: DiscountableCoupon): number {
  const raw =
    coupon.discountType === 'PERCENTAGE'
      ? Math.floor((subtotalPiasters * coupon.value) / 100)
      : coupon.value;
  const capped =
    coupon.maximumDiscountPiasters === null ? raw : Math.min(raw, coupon.maximumDiscountPiasters);
  return Math.min(subtotalPiasters, Math.max(0, capped));
}
