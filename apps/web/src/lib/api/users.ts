import { apiRequest } from '@/lib/api/http-client';
import type { ProfileInput } from '@/lib/validation/profile';
import type { PaginatedUsers, User, UserStatus } from '@/types/user';

export function getProfile(): Promise<User> {
  return apiRequest('/users/me');
}

export function updateProfile(input: ProfileInput): Promise<User> {
  return apiRequest('/users/me', {
    body: { ...input, phone: input.phone || null },
    method: 'PATCH',
  });
}

export interface CustomerFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: UserStatus | '';
}

export function listCustomers(filters: CustomerFilters): Promise<PaginatedUsers> {
  const query = new URLSearchParams();
  query.set('page', String(filters.page ?? 1));
  query.set('limit', String(filters.limit ?? 20));
  if (filters.search) query.set('search', filters.search);
  if (filters.status) query.set('status', filters.status);
  return apiRequest(`/admin/users?${query.toString()}`);
}

export function setCustomerStatus(id: string, status: UserStatus): Promise<User> {
  return apiRequest(`/admin/users/${id}/status`, { body: { status }, method: 'PATCH' });
}
