'use client';

import { useQuery } from '@tanstack/react-query';

import { getCurrentUser } from '@/lib/api/auth';

export const currentUserQueryKey = ['auth', 'current-user'] as const;

export function useCurrentUser() {
  return useQuery({
    queryKey: currentUserQueryKey,
    queryFn: getCurrentUser,
    retry: false,
  });
}
