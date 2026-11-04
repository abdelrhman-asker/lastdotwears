'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { PasswordInput } from '@/components/ui/password-input';
import { StatusMessage } from '@/components/ui/status-message';
import { resetPassword } from '@/lib/api/auth';
import { errorMessage } from '@/lib/api/http-client';
import { resetPasswordSchema, type ResetPasswordFormInput } from '@/lib/validation/auth';

interface ResetPasswordFormProps {
  token: string;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [requestError, setRequestError] = useState<string | null>(null);
  const form = useForm<ResetPasswordFormInput>({
    defaultValues: { token },
    resolver: zodResolver(resetPasswordSchema),
  });
  const mutation = useMutation({
    mutationFn: resetPassword,
    onError: (error) => setRequestError(errorMessage(error)),
  });

  if (!token) {
    return (
      <StatusMessage tone="error">This reset link is incomplete. Request a new one.</StatusMessage>
    );
  }

  if (mutation.data) {
    return (
      <div className="space-y-5">
        <StatusMessage tone="success">{mutation.data.message}</StatusMessage>
        <Link
          className="block bg-stone-950 px-5 py-3 text-center text-sm font-medium text-white"
          href="/login"
        >
          Continue to sign in
        </Link>
      </div>
    );
  }

  return (
    <form
      className="space-y-5"
      noValidate
      onSubmit={form.handleSubmit(({ password, token: resetToken }) => {
        setRequestError(null);
        mutation.mutate({ password, token: resetToken });
      })}
    >
      {requestError ? <StatusMessage tone="error">{requestError}</StatusMessage> : null}
      <input type="hidden" {...form.register('token')} />
      <Field
        error={form.formState.errors.password?.message}
        hint="At least 12 characters with uppercase, lowercase, a number, and a symbol."
        htmlFor="password"
        label="New password"
      >
        <PasswordInput autoComplete="new-password" id="password" {...form.register('password')} />
      </Field>
      <Field
        error={form.formState.errors.confirmPassword?.message}
        htmlFor="confirmPassword"
        label="Confirm new password"
      >
        <PasswordInput
          autoComplete="new-password"
          id="confirmPassword"
          {...form.register('confirmPassword')}
        />
      </Field>
      <Button className="w-full" disabled={mutation.isPending} type="submit">
        {mutation.isPending ? 'Updating password…' : 'Update password'}
      </Button>
    </form>
  );
}
