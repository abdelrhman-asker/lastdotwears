import type { ShippingRateRecord, ShippingRateWriteInput } from './shipping-rate.interface.js';

export const SHIPPING_REPOSITORY = Symbol('SHIPPING_REPOSITORY');

export interface ShippingRepository {
  listPublic(): Promise<ShippingRateRecord[]>;
  listAdmin(): Promise<ShippingRateRecord[]>;
  findById(id: string): Promise<ShippingRateRecord | null>;
  create(input: ShippingRateWriteInput): Promise<ShippingRateRecord>;
  update(id: string, input: Partial<ShippingRateWriteInput>): Promise<ShippingRateRecord | null>;
  remove(id: string): Promise<'deleted' | 'used' | 'not_found'>;
}
