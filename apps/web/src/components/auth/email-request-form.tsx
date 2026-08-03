'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { StatusMessage } from '@/components/ui/status-message';
import { requestPasswordReset, resendVerification } from '@/lib/api/auth';
import { errorMessage } from '@/lib/api/http-client';
import { emailRequestSchema, type EmailRequestInput } from '@/lib/validation/auth';

interface EmailRequestFormProps {
  purpose: 'password' | 'verification';
}

export function EmailRequestForm({ purpose }: EmailRequestFormProps) {
  const [requestError, setRequestError] = useState<string | null>(null);
  const form = useForm<EmailRequestInput>({ resolver: zodResolver(emailRequestSchema) });
  const mutation = useMutation({
    mutationFn: ({ email }: EmailRequestInput) =>
      purpose === 'password' ? requestPasswordReset(email) : resendVerification(email),
    onError: (error) => setRequestError(errorMessage(error)),
  });

  return (
    <form
      className="space-y-5"
      noValidate
      onSubmit={form.handleSubmit((input) => {
        setRequestError(null);
        mutation.mutate(input);
      })}
    >
      {requestError ? <StatusMessage tone="error">{requestError}</StatusMessage> : null}
      {mutation.data ? <StatusMessage tone="success">{mutation.data.message}</StatusMessage> : null}
      <Field error={form.formState.errors.email?.message} htmlFor="email" label="Email address">
        <Input autoComplete="email" id="email" type="email" {...form.register('email')} />
      </Field>
      <Button className="w-full" disabled={mutation.isPending} type="submit">
        {mutation.isPending
          ? 'Sending…'
          : purpose === 'password'
            ? 'Send reset link'
            : 'Resend verification email'}
      </Button>
      <p className="text-center text-sm text-stone-600">
        <Link className="underline-offset-4 hover:underline" href="/login">
          Return to sign in
        </Link>
      </p>
    </form>
  );
}
