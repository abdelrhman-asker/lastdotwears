import { apiRequest } from '@/lib/api/http-client';
import type { ContactMessageInput } from '@/types/settings';

export function submitContactMessage(
  input: ContactMessageInput,
): Promise<{ id: string; message: string }> {
  return apiRequest('/contact', { method: 'POST', body: input, retryAuthentication: false });
}
