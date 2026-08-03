'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createAddress,
  deleteAddress,
  listAddresses,
  setDefaultAddress,
  updateAddress,
} from '@/lib/api/addresses';
import type { AddressFormInput } from '@/lib/validation/address';

export const addressesQueryKey = ['account', 'addresses'] as const;

export function useAddresses(enabled = true) {
  return useQuery({
    queryKey: addressesQueryKey,
    queryFn: listAddresses,
    enabled,
    retry: false,
  });
}

export function useCreateAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAddress,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: addressesQueryKey }),
  });
}

export function useUpdateAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AddressFormInput }) =>
      updateAddress(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: addressesQueryKey }),
  });
}

export function useSetDefaultAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setDefaultAddress,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: addressesQueryKey }),
  });
}

export function useDeleteAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAddress,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: addressesQueryKey }),
  });
}
