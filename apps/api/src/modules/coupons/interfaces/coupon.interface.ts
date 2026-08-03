export type CouponDiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';

export interface CouponRecord {
  id: string;
  code: string;
  description: string | null;
  discountType: CouponDiscountType;
  value: number;
  minimumSubtotalPiasters: number;
  maximumDiscountPiasters: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
  usageLimit: number | null;
  perCustomerLimit: number;
  timesUsed: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CouponWriteInput {
  code: string;
  description: string | null;
  discountType: CouponDiscountType;
  value: number;
  minimumSubtotalPiasters: number;
  maximumDiscountPiasters: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
  usageLimit: number | null;
  perCustomerLimit: number;
  isActive: boolean;
}
