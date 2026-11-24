'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { StatusMessage } from '@/components/ui/status-message';
import { apiRequest, errorMessage } from '@/lib/api/http-client';
import { adminSetupEmail, adminSetupSchema, type AdminSetupInput } from '@/lib/validation/auth';

export function AdminSetupForm() {
  const router = useRouter();
  const [requestError, setRequestError] = useState<string>();
  const [created, setCreated] = useState(false);
  const form = useForm<AdminSetupInput>({
    resolver: zodResolver(adminSetupSchema),
    defaultValues: { email: adminSetupEmail, password: '', confirmPassword: '', setupSecret: '' },
  });
  const { errors, isSubmitting } = form.formState;

  const submit = form.handleSubmit(async (input) => {
    setRequestError(undefined);
    try {
      await apiRequest<void>('/admin/setup', {
        method: 'POST',
        body: input,
        retryAuthentication: false,
      });
      setCreated(true);
      router.replace('/admin/login');
    } catch (error) {
      setRequestError(errorMessage(error));
    } finally {
      form.resetField('setupSecret');
      form.resetField('password');
      form.resetField('confirmPassword');
    }
  });

  return (
    <form className="ph-no-capture ph-no-autocapture space-y-5" noValidate onSubmit={submit}>
      {requestError ? <StatusMessage tone="error">{requestError}</StatusMessage> : null}
      {created ? (
        <StatusMessage tone="success">Administrator created. Opening sign in…</StatusMessage>
      ) : null}
      <Field error={errors.email?.message} htmlFor="setup-email" label="Email address">
        <Input autoComplete="email" id="setup-email" type="email" {...form.register('email')} />
      </Field>
      <Field error={errors.password?.message} htmlFor="setup-password" label="Password">
        <PasswordInput
          autoComplete="new-password"
          id="setup-password"
          {...form.register('password')}
        />
      </Field>
      <Field
        error={errors.confirmPassword?.message}
        htmlFor="setup-confirm"
        label="Confirm password"
      >
        <PasswordInput
          autoComplete="new-password"
          id="setup-confirm"
          {...form.register('confirmPassword')}
        />
      </Field>
      <Field error={errors.setupSecret?.message} htmlFor="setup-secret" label="Setup secret">
        <Input
          autoComplete="off"
          id="setup-secret"
          type="password"
          {...form.register('setupSecret')}
        />
      </Field>
      <Button className="w-full" disabled={isSubmitting || created} type="submit">
        {isSubmitting ? 'Creating administrator…' : 'Create Administrator'}
      </Button>
    </form>
  );
}
