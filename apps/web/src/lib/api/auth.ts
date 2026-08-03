import { apiRequest } from '@/lib/api/http-client';
import type { LoginInput, RegisterInput, ResetPasswordInput } from '@/lib/validation/auth';
import type { User } from '@/types/user';

export interface AuthenticationResponse {
  user: User;
}

export interface MessageResponse {
  message: string;
}

export function registerCustomer(input: RegisterInput): Promise<AuthenticationResponse> {
  return apiRequest('/auth/register', { body: input, method: 'POST', retryAuthentication: false });
}

export function loginCustomer(input: LoginInput): Promise<AuthenticationResponse> {
  return apiRequest('/auth/login', { body: input, method: 'POST', retryAuthentication: false });
}

export function loginAdministrator(input: LoginInput): Promise<AuthenticationResponse> {
  return apiRequest('/admin/auth/login', {
    body: input,
    method: 'POST',
    retryAuthentication: false,
  });
}

export function getCurrentUser(): Promise<User> {
  return apiRequest('/auth/me');
}

export function logout(): Promise<MessageResponse> {
  return apiRequest('/auth/logout', { method: 'POST', retryAuthentication: false });
}

export function requestPasswordReset(email: string): Promise<MessageResponse> {
  return apiRequest('/auth/forgot-password', {
    body: { email },
    method: 'POST',
    retryAuthentication: false,
  });
}

export function resendVerification(email: string): Promise<MessageResponse> {
  return apiRequest('/auth/resend-verification', {
    body: { email },
    method: 'POST',
    retryAuthentication: false,
  });
}

export function verifyEmail(token: string): Promise<User> {
  return apiRequest('/auth/verify-email', {
    body: { token },
    method: 'POST',
    retryAuthentication: false,
  });
}

export function resetPassword(input: ResetPasswordInput): Promise<MessageResponse> {
  return apiRequest('/auth/reset-password', {
    body: input,
    method: 'POST',
    retryAuthentication: false,
  });
}
