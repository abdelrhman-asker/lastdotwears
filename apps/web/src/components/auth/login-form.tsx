'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { StatusMessage } from '@/components/ui/status-message';
import { commerceQueryKeys } from '@/hooks/use-commerce';
import { currentUserQueryKey } from '@/hooks/use-current-user';
import { captureAnalyticsEvent, identifyAnalyticsUser } from '@/lib/analytics/client';
import { loginAdministrator, loginCustomer } from '@/lib/api/auth';
import { errorMessage } from '@/lib/api/http-client';
import { loginSchema, type LoginInput } from '@/lib/validation/auth';

interface LoginFormProps {
  admin?: boolean;
  redirectTo?: string;
}

export function LoginForm({ admin = false, redirectTo }: LoginFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [requestError, setRequestError] = useState<string | null>(null);
  const form = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });
  const mutation = useMutation({
    mutationFn: admin ? loginAdministrator : loginCustomer,
    onSuccess: async ({ user }) => {
      queryClient.setQueryData(currentUserQueryKey, user);
      await queryClient.invalidateQueries({ queryKey: currentUserQueryKey });

      if (!admin) {
        await identifyAnalyticsUser(user.id);
        await captureAnalyticsEvent('login_success', { user_id: user.id });
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: commerceQueryKeys.cart }),
          queryClient.invalidateQueries({ queryKey: commerceQueryKeys.wishlist }),
        ]);
      }

      router.replace(admin ? '/admin/customers' : (redirectTo ?? '/account/profile'));
    },
    onError: (error) => setRequestError(errorMessage(error)),
  });

  const submit = form.handleSubmit((input) => {
    setRequestError(null);
    mutation.mutate(input);
  });

  return (
    <form className="space-y-5" noValidate onSubmit={submit}>
      {requestError ? <StatusMessage tone="error">{requestError}</StatusMessage> : null}
      <Field error={form.formState.errors.email?.message} htmlFor="email" label="Email address">
        <Input autoComplete="email" id="email" type="email" {...form.register('email')} />
      </Field>
      <Field error={form.formState.errors.password?.message} htmlFor="password" label="Password">
        <PasswordInput
          autoComplete="current-password"
          id="password"
          {...form.register('password')}
        />
      </Field>
      {!admin ? (
        <div className="text-right">
          <Link
            className="text-sm text-stone-600 underline-offset-4 hover:underline"
            href="/forgot-password"
          >
            Forgot password?
          </Link>
        </div>
      ) : null}
      <Button
        className="w-full"
        data-analytics-custom="login"
        disabled={mutation.isPending}
        type="submit"
      >
        {mutation.isPending ? 'Signing in…' : admin ? 'Sign in securely' : 'Sign in'}
      </Button>
      {!admin ? (
        <p className="text-center text-sm text-stone-600">
          New here?{' '}
          <Link
            className="font-medium text-stone-950 underline-offset-4 hover:underline"
            href="/register"
          >
            Create an account
          </Link>
        </p>
      ) : null}
    </form>
  );
}
