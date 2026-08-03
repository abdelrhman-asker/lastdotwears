import type { AddressRecord, AddressWriteInput } from './address.interface.js';

export const ADDRESSES_REPOSITORY = Symbol('ADDRESSES_REPOSITORY');

export type CreateAddressResult = AddressRecord | 'governorate_unavailable' | 'limit_reached';
export type UpdateAddressResult = AddressRecord | 'governorate_unavailable' | 'not_found';

export interface AddressesRepository {
  list(userId: string): Promise<AddressRecord[]>;
  create(userId: string, input: AddressWriteInput): Promise<CreateAddressResult>;
  update(userId: string, id: string, input: AddressWriteInput): Promise<UpdateAddressResult>;
  remove(userId: string, id: string): Promise<'deleted' | 'not_found'>;
}
