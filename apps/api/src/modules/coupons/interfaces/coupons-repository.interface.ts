import type { CouponRecord, CouponWriteInput } from './coupon.interface.js';

export const COUPONS_REPOSITORY = Symbol('COUPONS_REPOSITORY');

export interface CouponsRepository {
  list(input: {
    page: number;
    limit: number;
    search?: string;
    isActive?: boolean;
  }): Promise<{ items: CouponRecord[]; total: number }>;
  findById(id: string): Promise<CouponRecord | null>;
  create(input: CouponWriteInput): Promise<CouponRecord>;
  update(id: string, input: Partial<CouponWriteInput>): Promise<CouponRecord | null>;
  remove(id: string): Promise<'deleted' | 'used' | 'not_found'>;
}
