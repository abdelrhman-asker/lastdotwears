import { apiRequest } from '@/lib/api/http-client';
import type { AddressFormInput } from '@/lib/validation/address';
import type { Address } from '@/types/address';

function addressBody(input: AddressFormInput) {
  return {
    ...input,
    addressLine2: input.addressLine2 || null,
    postalCode: input.postalCode || null,
    deliveryNotes: input.deliveryNotes || null,
  };
}

export function listAddresses(): Promise<Address[]> {
  return apiRequest('/addresses');
}

export function createAddress(input: AddressFormInput): Promise<Address> {
  return apiRequest('/addresses', { method: 'POST', body: addressBody(input) });
}

export function updateAddress(id: string, input: AddressFormInput): Promise<Address> {
  return apiRequest(`/addresses/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: addressBody(input),
  });
}

export function setDefaultAddress(id: string): Promise<Address> {
  return apiRequest(`/addresses/${encodeURIComponent(id)}/default`, {
    method: 'PATCH',
  });
}

export function deleteAddress(id: string): Promise<void> {
  return apiRequest(`/addresses/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
