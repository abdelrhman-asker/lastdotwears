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
import { registerCustomer } from '@/lib/api/auth';
import { errorMessage } from '@/lib/api/http-client';
import { registerSchema, type RegisterFormInput } from '@/lib/validation/auth';

export function RegisterForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [requestError, setRequestError] = useState<string | null>(null);
  const form = useForm<RegisterFormInput>({ resolver: zodResolver(registerSchema) });
  const mutation = useMutation({
    mutationFn: registerCustomer,
    onSuccess: async ({ user }) => {
      queryClient.setQueryData(currentUserQueryKey, user);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: commerceQueryKeys.cart }),
        queryClient.invalidateQueries({ queryKey: commerceQueryKeys.wishlist }),
      ]);
      router.replace('/account/profile?registered=1');
    },
    onError: (error) => setRequestError(errorMessage(error)),
  });

  const submit = form.handleSubmit((input) => {
    setRequestError(null);
    mutation.mutate({
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      password: input.password,
      ...(input.phone ? { phone: input.phone } : {}),
    });
  });

  return (
    <form className="space-y-5" noValidate onSubmit={submit}>
      {requestError ? <StatusMessage tone="error">{requestError}</StatusMessage> : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          error={form.formState.errors.firstName?.message}
          htmlFor="firstName"
          label="First name"
        >
          <Input autoComplete="given-name" id="firstName" {...form.register('firstName')} />
        </Field>
        <Field error={form.formState.errors.lastName?.message} htmlFor="lastName" label="Last name">
          <Input autoComplete="family-name" id="lastName" {...form.register('lastName')} />
        </Field>
      </div>
      <Field error={form.formState.errors.email?.message} htmlFor="email" label="Email address">
        <Input autoComplete="email" id="email" type="email" {...form.register('email')} />
      </Field>
      <Field
        error={form.formState.errors.phone?.message}
        hint="Egyptian mobile number, for example 01012345678."
        htmlFor="phone"
        label="Mobile number (optional)"
      >
        <Input autoComplete="tel" id="phone" inputMode="tel" {...form.register('phone')} />
      </Field>
      <Field
        error={form.formState.errors.password?.message}
        hint="At least 12 characters with uppercase, lowercase, a number, and a symbol."
        htmlFor="password"
        label="Password"
      >
        <PasswordInput autoComplete="new-password" id="password" {...form.register('password')} />
      </Field>
      <Field
        error={form.formState.errors.confirmPassword?.message}
        htmlFor="confirmPassword"
        label="Confirm password"
      >
        <PasswordInput
          autoComplete="new-password"
          id="confirmPassword"
          {...form.register('confirmPassword')}
        />
      </Field>
      <Button className="w-full" disabled={mutation.isPending} type="submit">
        {mutation.isPending ? 'Creating account…' : 'Create account'}
      </Button>
      <p className="text-center text-sm text-stone-600">
        Already have an account?{' '}
        <Link
          className="font-medium text-stone-950 underline-offset-4 hover:underline"
          href="/login"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
